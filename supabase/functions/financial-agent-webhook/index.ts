import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const customerProductId = url.searchParams.get('customer_product_id');
    const webhookToken = url.searchParams.get('token');

    if (!customerProductId || !webhookToken) {
      console.error("Missing customer_product_id or token");
      return new Response(
        JSON.stringify({ error: "Missing customer_product_id or token" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate webhook token
    const { data: config, error: configError } = await supabase
      .from('financial_agent_config')
      .select('*')
      .eq('customer_product_id', customerProductId)
      .eq('webhook_token', webhookToken)
      .maybeSingle();

    if (configError || !config) {
      console.error("Invalid token or customer_product_id:", configError);
      return new Response(
        JSON.stringify({ error: "Invalid token or customer_product_id" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log("Received webhook body:", JSON.stringify(body));

    // All fields are OPTIONAL - process only what's provided
    const {
      message,
      session_id, // session_number (unique number like phone) - NOT the UUID
      // Transaction fields
      transaction_type,    // 'income' or 'expense'
      amount,
      description,
      date,
      payment_method,
      tags,
      // Invoice fields
      invoice_title,
      invoice_amount,
      invoice_due_date,
      invoice_notes,
      invoice_recurring,
      invoice_recurring_interval,
      // Mark invoice paid
      mark_paid_invoice_id,
      // Query flags
      get_balance,
      get_pending_invoices,
      get_summary,
      balance_start_date,
      balance_end_date,
    } = body;

    const results: any = {};
    const messages: string[] = [];

    // Lookup actual session UUID from session_number
    let actualSessionId: string | null = null;
    if (session_id) {
      const { data: sessionData } = await supabase
        .from('financial_chat_sessions')
        .select('id')
        .eq('session_number', session_id)
        .eq('customer_product_id', customerProductId)
        .maybeSingle();
      
      actualSessionId = sessionData?.id || null;
      console.log(`Session lookup: session_number=${session_id} -> id=${actualSessionId}`);
    }

    // Log incoming message if provided (with actual session UUID)
    if (message) {
      await supabase.from('financial_agent_chat_logs').insert({
        customer_product_id: customerProductId,
        session_id: actualSessionId,
        direction: 'outgoing',
        message: message
      });
    }

    // 1. Add transaction if amount and type provided
    if (amount && transaction_type) {
      const { data: transaction, error: txError } = await supabase
        .from('financial_agent_transactions')
        .insert({
          customer_product_id: customerProductId,
          type: transaction_type,
          amount: parseFloat(amount),
          description: description || null,
          date: date || new Date().toISOString().split('T')[0],
          payment_method: payment_method || null,
          tags: tags || null,
          source: 'webhook'
        })
        .select()
        .single();

      if (txError) {
        console.error("Error inserting transaction:", txError);
        results.transaction_error = txError.message;
      } else {
        results.transaction = transaction;
        messages.push(`${transaction_type === 'income' ? 'Receita' : 'Despesa'} de R$ ${parseFloat(amount).toFixed(2)} adicionada!`);
      }
    }

    // 2. Add invoice if invoice fields provided
    if (invoice_title && invoice_amount && invoice_due_date) {
      const { data: invoice, error: invError } = await supabase
        .from('financial_agent_invoices')
        .insert({
          customer_product_id: customerProductId,
          title: invoice_title,
          amount: parseFloat(invoice_amount),
          due_date: invoice_due_date,
          notes: invoice_notes || null,
          recurring: invoice_recurring || false,
          recurring_interval: invoice_recurring_interval || null,
          source: 'webhook'
        })
        .select()
        .single();

      if (invError) {
        console.error("Error inserting invoice:", invError);
        results.invoice_error = invError.message;
      } else {
        results.invoice = invoice;
        messages.push(`Fatura "${invoice_title}" de R$ ${parseFloat(invoice_amount).toFixed(2)} adicionada!`);
      }
    }

    // 3. Mark invoice as paid
    if (mark_paid_invoice_id) {
      const { data: paidInvoice, error: paidError } = await supabase
        .from('financial_agent_invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', mark_paid_invoice_id)
        .eq('customer_product_id', customerProductId)
        .select()
        .single();

      if (paidError) {
        console.error("Error marking invoice paid:", paidError);
        results.mark_paid_error = paidError.message;
      } else {
        results.paid_invoice = paidInvoice;
        messages.push(`Fatura "${paidInvoice.title}" marcada como paga!`);
      }
    }

    // 4. Get balance if requested
    if (get_balance) {
      let query = supabase
        .from('financial_agent_transactions')
        .select('type, amount')
        .eq('customer_product_id', customerProductId);

      if (balance_start_date) query = query.gte('date', balance_start_date);
      if (balance_end_date) query = query.lte('date', balance_end_date);

      const { data: transactions, error: balanceError } = await query;

      if (balanceError) {
        results.balance_error = balanceError.message;
      } else {
        const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
        const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
        results.balance = { income, expenses, total: income - expenses };
        messages.push(`Saldo: R$ ${(income - expenses).toFixed(2)}`);
      }
    }

    // 5. Get pending invoices if requested
    if (get_pending_invoices) {
      const { data: pendingInvoices, error: pendingError } = await supabase
        .from('financial_agent_invoices')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (pendingError) {
        results.pending_invoices_error = pendingError.message;
      } else {
        const total = pendingInvoices?.reduce((sum, inv) => sum + parseFloat(inv.amount), 0) || 0;
        results.pending_invoices = pendingInvoices;
        results.pending_invoices_total = total;
        messages.push(`${pendingInvoices?.length || 0} faturas pendentes totalizando R$ ${total.toFixed(2)}`);
      }
    }

    // 6. Get monthly summary if requested
    if (get_summary) {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const { data: monthTransactions } = await supabase
        .from('financial_agent_transactions')
        .select('type, amount')
        .eq('customer_product_id', customerProductId)
        .gte('date', `${currentMonth}-01`)
        .lte('date', `${currentMonth}-31`);

      const { data: monthPending } = await supabase
        .from('financial_agent_invoices')
        .select('amount')
        .eq('customer_product_id', customerProductId)
        .eq('status', 'pending');

      const income = monthTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      const expenses = monthTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      const pendingTotal = monthPending?.reduce((sum, inv) => sum + parseFloat(inv.amount), 0) || 0;

      results.summary = {
        month: currentMonth,
        income,
        expenses,
        balance: income - expenses,
        pending_invoices_total: pendingTotal
      };
      messages.push(`Resumo ${currentMonth}: Receitas R$ ${income.toFixed(2)}, Despesas R$ ${expenses.toFixed(2)}, Saldo R$ ${(income - expenses).toFixed(2)}`);
    }

    // Build response message - only if there are actual actions
    const responseMessage = messages.length > 0 
      ? messages.join('\n') 
      : null;

    // Log outgoing response only if there's a meaningful message (with actual session UUID)
    if (responseMessage) {
      await supabase.from('financial_agent_chat_logs').insert({
        customer_product_id: customerProductId,
        session_id: actualSessionId,
        direction: 'outgoing',
        message: responseMessage
      });
    }

    // Forward to n8n if configured
    if (config.n8n_webhook_url) {
      try {
        await fetch(config.n8n_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_product_id: customerProductId,
            session_id: session_id,
            api_token: webhookToken, // Token para chamar a API de volta
            api_url: `${supabaseUrl}/functions/v1/financial-agent-api`,
            response: responseMessage,
            results
          })
        });
      } catch (webhookError) {
        console.error("Error forwarding to n8n:", webhookError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: responseMessage || "Requisição recebida.",
        session_id: session_id,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in financial-agent-webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
