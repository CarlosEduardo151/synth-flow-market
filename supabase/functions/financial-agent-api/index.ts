import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get token from query params or body
    const url = new URL(req.url);
    let token = url.searchParams.get('token');
    
    let body: any = {};
    if (req.method === 'POST') {
      body = await req.json();
      if (!token && body.token) {
        token = body.token;
      }
    }

    if (!token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token obrigatório. Adicione ?token=SEU_TOKEN na URL ou envie no body.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token and get customer_product_id
    const { data: config, error: configError } = await supabase
      .from('financial_agent_config')
      .select('customer_product_id, business_name, currency')
      .eq('webhook_token', token)
      .single();

    if (configError || !config) {
      console.error('Token validation error:', configError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token inválido ou expirado.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerProductId = config.customer_product_id;
    console.log(`API request for customer_product_id: ${customerProductId}, business: ${config.business_name}`);

    // Get operation from body - accept both PT and EN field names
    const recurso = body.recurso || body.resource;
    const operacao = body.operacao || body.operation;
    const dados = body.dados || body.data;

    if (!recurso || !operacao) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Campos obrigatórios: recurso/resource e operacao/operation',
          documentacao: {
            recursos: ['transacoes/transactions', 'faturas/invoices', 'metas/goals', 'categorias/categories', 'resumo/summary'],
            operacoes: ['criar/create', 'listar/list', 'atualizar/update', 'deletar/delete'],
            exemplo_pt: {
              token: 'SEU_TOKEN',
              recurso: 'transacoes',
              operacao: 'criar',
              dados: {
                tipo: 'receita',
                descricao: 'Venda de produto',
                valor: 1500.00,
                data: '2024-01-15'
              }
            },
            exemplo_en: {
              token: 'YOUR_TOKEN',
              resource: 'transactions',
              operation: 'create',
              data: {
                type: 'income',
                description: 'Product sale',
                amount: 1500.00,
                date: '2024-01-15'
              }
            }
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: any;

    switch (recurso.toLowerCase()) {
      case 'transacoes':
      case 'transações':
      case 'transactions':
        result = await handleTransactions(supabase, customerProductId, operacao, dados);
        break;
      case 'faturas':
      case 'invoices':
        result = await handleInvoices(supabase, customerProductId, operacao, dados);
        break;
      case 'metas':
      case 'goals':
        result = await handleGoals(supabase, customerProductId, operacao, dados);
        break;
      case 'categorias':
      case 'categories':
        result = await handleCategories(supabase, customerProductId, operacao, dados);
        break;
      case 'resumo':
      case 'summary':
        result = await handleSummary(supabase, customerProductId);
        break;
      default:
        result = {
          success: false,
          error: `Recurso '${recurso}' não reconhecido / Resource not recognized`,
          recursos_disponiveis: ['transacoes/transactions', 'faturas/invoices', 'metas/goals', 'categorias/categories', 'resumo/summary']
        };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ==================== HELPER: Normalize field names (accept both PT and EN) ====================
function normalizeData(dados: any) {
  if (!dados) return dados;
  return {
    // Transaction fields
    tipo: dados.tipo || dados.type,
    valor: dados.valor ?? dados.amount ?? dados.value,
    descricao: dados.descricao || dados.description,
    data: dados.data || dados.date,
    categoria_id: dados.categoria_id || dados.category_id,
    metodo_pagamento: dados.metodo_pagamento || dados.payment_method,
    tags: dados.tags,
    recorrente: dados.recorrente ?? dados.recurring,
    intervalo_recorrencia: dados.intervalo_recorrencia || dados.recurring_interval,
    source: dados.source || 'api',
    // Invoice fields
    titulo: dados.titulo || dados.title,
    vencimento: dados.vencimento || dados.due_date,
    status: dados.status,
    notas: dados.notas || dados.notes,
    // Goal fields
    nome: dados.nome || dados.name,
    valor_alvo: dados.valor_alvo ?? dados.target_amount ?? dados.target,
    valor_atual: dados.valor_atual ?? dados.current_amount ?? dados.current,
    prazo: dados.prazo || dados.deadline,
    // Category fields
    cor: dados.cor || dados.color,
    icone: dados.icone || dados.icon,
    // Common
    id: dados.id,
    limite: dados.limite ?? dados.limit,
    data_inicio: dados.data_inicio || dados.start_date,
    data_fim: dados.data_fim || dados.end_date,
  };
}

// ==================== TRANSAÇÕES ====================
async function handleTransactions(supabase: any, customerProductId: string, operacao: string, dados: any) {
  const d = normalizeData(dados);
  
  switch (operacao.toLowerCase()) {
    case 'criar':
    case 'adicionar':
    case 'create':
    case 'add':
      if (!d?.tipo || d?.valor === undefined) {
        return { success: false, error: 'Campos obrigatórios: tipo/type (receita/despesa ou income/expense), valor/amount' };
      }
      const typeValue = ['receita', 'income'].includes(d.tipo?.toLowerCase()) ? 'income' : 'expense';
      const { data: newTrans, error: createError } = await supabase
        .from('financial_agent_transactions')
        .insert({
          customer_product_id: customerProductId,
          type: typeValue,
          amount: Math.abs(d.valor),
          description: d.descricao || null,
          date: d.data || new Date().toISOString().split('T')[0],
          category_id: d.categoria_id || null,
          payment_method: d.metodo_pagamento || null,
          tags: d.tags || null,
          recurring: d.recorrente || false,
          recurring_interval: d.intervalo_recorrencia || null,
          source: d.source || 'api'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Create transaction error:', createError);
        return { success: false, error: createError.message };
      }
      return { success: true, mensagem: 'Transação criada com sucesso', dados: newTrans };

    case 'listar':
    case 'list':
      let query = supabase
        .from('financial_agent_transactions')
        .select('*, category:financial_agent_categories(name, color)')
        .eq('customer_product_id', customerProductId)
        .order('date', { ascending: false });
      
      if (d?.tipo) {
        const filterType = ['receita', 'income'].includes(d.tipo?.toLowerCase()) ? 'income' : 'expense';
        query = query.eq('type', filterType);
      }
      if (d?.data_inicio) {
        query = query.gte('date', d.data_inicio);
      }
      if (d?.data_fim) {
        query = query.lte('date', d.data_fim);
      }
      if (d?.limite) {
        query = query.limit(d.limite);
      } else {
        query = query.limit(100);
      }

      const { data: transactions, error: listError } = await query;
      if (listError) return { success: false, error: listError.message };
      return { success: true, total: transactions.length, dados: transactions };

    case 'atualizar':
    case 'update':
      if (!d?.id) {
        return { success: false, error: 'Campo obrigatório: id da transação' };
      }
      const updateData: any = {};
      if (d.tipo) updateData.type = ['receita', 'income'].includes(d.tipo?.toLowerCase()) ? 'income' : 'expense';
      if (d.valor !== undefined) updateData.amount = Math.abs(d.valor);
      if (d.descricao !== undefined) updateData.description = d.descricao;
      if (d.data) updateData.date = d.data;
      if (d.categoria_id) updateData.category_id = d.categoria_id;

      const { data: updatedTrans, error: updateError } = await supabase
        .from('financial_agent_transactions')
        .update(updateData)
        .eq('id', d.id)
        .eq('customer_product_id', customerProductId)
        .select()
        .single();
      
      if (updateError) return { success: false, error: updateError.message };
      return { success: true, mensagem: 'Transação atualizada', dados: updatedTrans };

    case 'deletar':
    case 'apagar':
    case 'delete':
      if (!d?.id) {
        return { success: false, error: 'Campo obrigatório: id da transação' };
      }
      const { error: deleteError } = await supabase
        .from('financial_agent_transactions')
        .delete()
        .eq('id', d.id)
        .eq('customer_product_id', customerProductId);
      
      if (deleteError) return { success: false, error: deleteError.message };
      return { success: true, mensagem: 'Transação deletada com sucesso' };

    case 'zerar':
    case 'clear':
      const { error: clearError } = await supabase
        .from('financial_agent_transactions')
        .delete()
        .eq('customer_product_id', customerProductId);
      
      if (clearError) return { success: false, error: clearError.message };
      return { success: true, mensagem: 'Todas as transações foram removidas' };

    default:
      return { success: false, error: `Operação '${operacao}' não reconhecida para transações` };
  }
}

// ==================== FATURAS ====================
async function handleInvoices(supabase: any, customerProductId: string, operacao: string, dados: any) {
  const d = normalizeData(dados);
  
  switch (operacao.toLowerCase()) {
    case 'criar':
    case 'adicionar':
    case 'create':
    case 'add':
      if (!d?.titulo || d?.valor === undefined || !d?.vencimento) {
        return { success: false, error: 'Campos obrigatórios: titulo/title, valor/amount, vencimento/due_date' };
      }
      const { data: newInvoice, error: createError } = await supabase
        .from('financial_agent_invoices')
        .insert({
          customer_product_id: customerProductId,
          title: d.titulo,
          amount: Math.abs(d.valor),
          due_date: d.vencimento,
          status: d.status || 'pending',
          category_id: d.categoria_id || null,
          notes: d.notas || null,
          recurring: d.recorrente || false,
          recurring_interval: d.intervalo_recorrencia || null,
          source: d.source || 'api'
        })
        .select()
        .single();
      
      if (createError) return { success: false, error: createError.message };
      return { success: true, mensagem: 'Fatura criada com sucesso', dados: newInvoice };

    case 'listar':
    case 'list':
      let query = supabase
        .from('financial_agent_invoices')
        .select('*, category:financial_agent_categories(name, color)')
        .eq('customer_product_id', customerProductId)
        .order('due_date', { ascending: true });
      
      if (d?.status) {
        query = query.eq('status', d.status);
      }
      if (d?.limite) {
        query = query.limit(d.limite);
      } else {
        query = query.limit(100);
      }

      const { data: invoices, error: listError } = await query;
      if (listError) return { success: false, error: listError.message };
      return { success: true, total: invoices.length, dados: invoices };

    case 'atualizar':
    case 'update':
      if (!d?.id) {
        return { success: false, error: 'Campo obrigatório: id da fatura' };
      }
      const updateData: any = {};
      if (d.titulo) updateData.title = d.titulo;
      if (d.valor !== undefined) updateData.amount = Math.abs(d.valor);
      if (d.vencimento) updateData.due_date = d.vencimento;
      if (d.status) updateData.status = d.status;
      if (d.notas !== undefined) updateData.notes = d.notas;

      const { data: updatedInvoice, error: updateError } = await supabase
        .from('financial_agent_invoices')
        .update(updateData)
        .eq('id', d.id)
        .eq('customer_product_id', customerProductId)
        .select()
        .single();
      
      if (updateError) return { success: false, error: updateError.message };
      return { success: true, mensagem: 'Fatura atualizada', dados: updatedInvoice };

    case 'pagar':
    case 'marcar_pago':
    case 'pay':
      if (!d?.id) {
        return { success: false, error: 'Campo obrigatório: id da fatura' };
      }
      const { data: paidInvoice, error: payError } = await supabase
        .from('financial_agent_invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', d.id)
        .eq('customer_product_id', customerProductId)
        .select()
        .single();
      
      if (payError) return { success: false, error: payError.message };
      return { success: true, mensagem: 'Fatura marcada como paga', dados: paidInvoice };

    case 'deletar':
    case 'apagar':
    case 'delete':
      if (!d?.id) {
        return { success: false, error: 'Campo obrigatório: id da fatura' };
      }
      const { error: deleteError } = await supabase
        .from('financial_agent_invoices')
        .delete()
        .eq('id', d.id)
        .eq('customer_product_id', customerProductId);
      
      if (deleteError) return { success: false, error: deleteError.message };
      return { success: true, mensagem: 'Fatura deletada com sucesso' };

    default:
      return { success: false, error: `Operação '${operacao}' não reconhecida para faturas` };
  }
}

// ==================== METAS ====================
async function handleGoals(supabase: any, customerProductId: string, operacao: string, dados: any) {
  const d = normalizeData(dados);
  
  switch (operacao.toLowerCase()) {
    case 'criar':
    case 'adicionar':
    case 'create':
    case 'add':
      if (!d?.nome || d?.valor_alvo === undefined) {
        return { success: false, error: 'Campos obrigatórios: nome/name, valor_alvo/target_amount' };
      }
      const { data: newGoal, error: createError } = await supabase
        .from('financial_agent_goals')
        .insert({
          customer_product_id: customerProductId,
          name: d.nome,
          target_amount: d.valor_alvo,
          current_amount: d.valor_atual || 0,
          deadline: d.prazo || null,
          status: d.status || 'active'
        })
        .select()
        .single();
      
      if (createError) return { success: false, error: createError.message };
      return { success: true, mensagem: 'Meta criada com sucesso', dados: newGoal };

    case 'listar':
    case 'list':
      const { data: goals, error: listError } = await supabase
        .from('financial_agent_goals')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .order('created_at', { ascending: false });
      
      if (listError) return { success: false, error: listError.message };
      return { success: true, total: goals.length, dados: goals };

    case 'atualizar':
    case 'update':
      if (!d?.id) {
        return { success: false, error: 'Campo obrigatório: id da meta' };
      }
      const updateData: any = {};
      if (d.nome) updateData.name = d.nome;
      if (d.valor_alvo !== undefined) updateData.target_amount = d.valor_alvo;
      if (d.valor_atual !== undefined) updateData.current_amount = d.valor_atual;
      if (d.prazo) updateData.deadline = d.prazo;
      if (d.status) updateData.status = d.status;

      const { data: updatedGoal, error: updateError } = await supabase
        .from('financial_agent_goals')
        .update(updateData)
        .eq('id', d.id)
        .eq('customer_product_id', customerProductId)
        .select()
        .single();
      
      if (updateError) return { success: false, error: updateError.message };
      return { success: true, mensagem: 'Meta atualizada', dados: updatedGoal };

    case 'adicionar_valor':
    case 'add_value':
      if (!d?.id || d?.valor === undefined) {
        return { success: false, error: 'Campos obrigatórios: id, valor/amount' };
      }
      // First get current value
      const { data: currentGoal } = await supabase
        .from('financial_agent_goals')
        .select('current_amount, target_amount')
        .eq('id', d.id)
        .eq('customer_product_id', customerProductId)
        .single();
      
      if (!currentGoal) return { success: false, error: 'Meta não encontrada' };
      
      const newAmount = Number(currentGoal.current_amount) + Number(d.valor);
      const newStatus = newAmount >= Number(currentGoal.target_amount) ? 'completed' : 'active';
      
      const { data: addedGoal, error: addError } = await supabase
        .from('financial_agent_goals')
        .update({ current_amount: newAmount, status: newStatus })
        .eq('id', d.id)
        .eq('customer_product_id', customerProductId)
        .select()
        .single();
      
      if (addError) return { success: false, error: addError.message };
      return { success: true, mensagem: `R$ ${d.valor} adicionado à meta`, dados: addedGoal };

    case 'deletar':
    case 'apagar':
    case 'delete':
      if (!d?.id) {
        return { success: false, error: 'Campo obrigatório: id da meta' };
      }
      const { error: deleteError } = await supabase
        .from('financial_agent_goals')
        .delete()
        .eq('id', d.id)
        .eq('customer_product_id', customerProductId);
      
      if (deleteError) return { success: false, error: deleteError.message };
      return { success: true, mensagem: 'Meta deletada com sucesso' };

    default:
      return { success: false, error: `Operação '${operacao}' não reconhecida para metas` };
  }
}

// ==================== CATEGORIAS ====================
async function handleCategories(supabase: any, customerProductId: string, operacao: string, dados: any) {
  const d = normalizeData(dados);
  
  switch (operacao.toLowerCase()) {
    case 'criar':
    case 'adicionar':
    case 'create':
    case 'add':
      if (!d?.nome || !d?.tipo) {
        return { success: false, error: 'Campos obrigatórios: nome/name, tipo/type (receita/despesa ou income/expense)' };
      }
      const typeValue = ['receita', 'income'].includes(d.tipo?.toLowerCase()) ? 'income' : 'expense';
      const { data: newCat, error: createError } = await supabase
        .from('financial_agent_categories')
        .insert({
          customer_product_id: customerProductId,
          name: d.nome,
          type: typeValue,
          color: d.cor || '#3B82F6',
          icon: d.icone || null,
          is_active: true
        })
        .select()
        .single();
      
      if (createError) return { success: false, error: createError.message };
      return { success: true, mensagem: 'Categoria criada com sucesso', dados: newCat };

    case 'listar':
    case 'list':
      let query = supabase
        .from('financial_agent_categories')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .eq('is_active', true);
      
      if (d?.tipo) {
        const filterType = ['receita', 'income'].includes(d.tipo?.toLowerCase()) ? 'income' : 'expense';
        query = query.eq('type', filterType);
      }

      const { data: categories, error: listError } = await query;
      if (listError) return { success: false, error: listError.message };
      return { success: true, total: categories.length, dados: categories };

    case 'atualizar':
    case 'update':
      if (!d?.id) {
        return { success: false, error: 'Campo obrigatório: id da categoria' };
      }
      const updateData: any = {};
      if (d.nome) updateData.name = d.nome;
      if (d.cor) updateData.color = d.cor;
      if (d.icone) updateData.icon = d.icone;
      const ativo = dados?.ativo ?? dados?.active;
      if (ativo !== undefined) updateData.is_active = ativo;

      const { data: updatedCat, error: updateError } = await supabase
        .from('financial_agent_categories')
        .update(updateData)
        .eq('id', d.id)
        .eq('customer_product_id', customerProductId)
        .select()
        .single();
      
      if (updateError) return { success: false, error: updateError.message };
      return { success: true, mensagem: 'Categoria atualizada', dados: updatedCat };

    case 'deletar':
    case 'apagar':
    case 'delete':
      if (!d?.id) {
        return { success: false, error: 'Campo obrigatório: id da categoria' };
      }
      // Soft delete - just deactivate
      const { error: deleteError } = await supabase
        .from('financial_agent_categories')
        .update({ is_active: false })
        .eq('id', d.id)
        .eq('customer_product_id', customerProductId);
      
      if (deleteError) return { success: false, error: deleteError.message };
      return { success: true, mensagem: 'Categoria desativada com sucesso' };

    default:
      return { success: false, error: `Operação '${operacao}' não reconhecida para categorias` };
  }
}

// ==================== RESUMO ====================
async function handleSummary(supabase: any, customerProductId: string) {
  // Get transactions for current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data: transactions } = await supabase
    .from('financial_agent_transactions')
    .select('type, amount')
    .eq('customer_product_id', customerProductId)
    .gte('date', firstDayOfMonth)
    .lte('date', lastDayOfMonth);

  const { data: pendingInvoices } = await supabase
    .from('financial_agent_invoices')
    .select('amount, due_date')
    .eq('customer_product_id', customerProductId)
    .eq('status', 'pending');

  const { data: goals } = await supabase
    .from('financial_agent_goals')
    .select('name, target_amount, current_amount, status')
    .eq('customer_product_id', customerProductId)
    .eq('status', 'active');

  let totalReceitas = 0;
  let totalDespesas = 0;
  
  transactions?.forEach((t: any) => {
    if (t.type === 'income') {
      totalReceitas += Number(t.amount);
    } else {
      totalDespesas += Number(t.amount);
    }
  });

  const totalFaturasPendentes = pendingInvoices?.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0) || 0;

  return {
    success: true,
    dados: {
      mes_atual: {
        receitas: totalReceitas,
        despesas: totalDespesas,
        saldo: totalReceitas - totalDespesas
      },
      faturas_pendentes: {
        total: pendingInvoices?.length || 0,
        valor_total: totalFaturasPendentes
      },
      metas_ativas: goals?.map((g: any) => ({
        nome: g.name,
        progresso: `${((Number(g.current_amount) / Number(g.target_amount)) * 100).toFixed(1)}%`,
        valor_atual: Number(g.current_amount),
        valor_alvo: Number(g.target_amount)
      })) || []
    }
  };
}
