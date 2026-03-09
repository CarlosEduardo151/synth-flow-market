import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');

interface NotifyPayload {
  service_order_id: string;
  stage: string;
  from_stage?: string;
  vehicle_placa?: string;
  oficina_nome?: string;
  valor?: number;
  changed_by?: string;
  customer_product_id: string;
}

const STAGE_LABELS: Record<string, string> = {
  checkin: 'Check-In realizado',
  orcamento_enviado: 'Orçamento enviado',
  orcamento_analise: 'Orçamento em análise',
  orcamento_aprovado: 'Orçamento aprovado',
  veiculo_finalizado: 'Veículo finalizado',
  veiculo_entregue: 'Veículo entregue',
};

function buildMessage(payload: NotifyPayload): { title: string; message: string } {
  const stageLabel = STAGE_LABELS[payload.stage] || payload.stage;
  const placa = payload.vehicle_placa || 'N/A';
  const title = `🔔 ${stageLabel} — ${placa}`;
  let message = `O veículo ${placa} avançou para "${stageLabel}".`;

  if (payload.oficina_nome) message += ` Oficina: ${payload.oficina_nome}.`;
  if (payload.valor) message += ` Valor: R$ ${payload.valor.toFixed(2).replace('.', ',')}.`;

  return { title, message };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflightRequest(req);
  const origin = req.headers.get('Origin');

  try {
    const payload: NotifyPayload = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { title, message } = buildMessage(payload);

    // Determine recipients: fleet owner + workshop user
    const recipients: { user_id: string; role: string }[] = [];

    // Find fleet owner via customer_product
    const { data: cp } = await supabase
      .from('customer_products')
      .select('user_id')
      .eq('id', payload.customer_product_id)
      .single();
    if (cp) recipients.push({ user_id: cp.user_id, role: 'gestor' });

    // Find workshop user if SO has a workshop_id
    const { data: so } = await supabase
      .from('fleet_service_orders')
      .select('workshop_id')
      .eq('id', payload.service_order_id)
      .single();
    if (so?.workshop_id) {
      const { data: workshop } = await supabase
        .from('fleet_partner_workshops')
        .select('user_id')
        .eq('id', so.workshop_id)
        .single();
      if (workshop) recipients.push({ user_id: workshop.user_id, role: 'oficina' });
    }

    // Insert in-app notifications
    const notifications = recipients.map(r => ({
      customer_product_id: payload.customer_product_id,
      service_order_id: payload.service_order_id,
      recipient_user_id: r.user_id,
      recipient_role: r.role,
      channel: 'in_app',
      title,
      message,
      stage: payload.stage,
      is_read: false,
      delivered: true,
      sent_at: new Date().toISOString(),
    }));

    await supabase.from('fleet_notifications').insert(notifications);

    // Send email notifications via Resend (if configured)
    if (resendApiKey) {
      for (const r of recipients) {
        const { data: userData } = await supabase.auth.admin.getUserById(r.user_id);
        const email = userData?.user?.email;
        if (!email) continue;

        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Auditt <noreply@resend.dev>',
              to: email,
              subject: title,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2 style="color:#1a1a2e;">${title}</h2>
                <p style="font-size:16px;color:#333;">${message}</p>
                <hr style="border:1px solid #eee;margin:20px 0;">
                <p style="color:#888;font-size:12px;">Notificação automática do sistema Auditt.</p>
              </div>`,
            }),
          });

          // Also save email notification record
          await supabase.from('fleet_notifications').insert({
            customer_product_id: payload.customer_product_id,
            service_order_id: payload.service_order_id,
            recipient_user_id: r.user_id,
            recipient_role: r.role,
            channel: 'email',
            title,
            message,
            stage: payload.stage,
            is_read: false,
            delivered: true,
            sent_at: new Date().toISOString(),
          });
        } catch (emailErr) {
          console.error('Email send failed:', emailErr);
        }
      }
    }

    // Send WhatsApp notifications via Z-API (if credentials exist)
    for (const r of recipients) {
      try {
        const { data: creds } = await supabase
          .from('product_credentials')
          .select('credentials')
          .eq('user_id', r.user_id)
          .eq('credential_type', 'zapi')
          .maybeSingle();

        if (!creds?.credentials) continue;
        const zapiCreds = creds.credentials as any;
        if (!zapiCreds.instance_id || !zapiCreds.client_token || !zapiCreds.phone) continue;

        const zapiUrl = `https://api.z-api.io/instances/${zapiCreds.instance_id}/token/${zapiCreds.client_token}/send-text`;
        await fetch(zapiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: zapiCreds.phone,
            message: `${title}\n\n${message}`,
          }),
        });

        await supabase.from('fleet_notifications').insert({
          customer_product_id: payload.customer_product_id,
          service_order_id: payload.service_order_id,
          recipient_user_id: r.user_id,
          recipient_role: r.role,
          channel: 'whatsapp',
          title,
          message,
          stage: payload.stage,
          is_read: false,
          delivered: true,
          sent_at: new Date().toISOString(),
        });
      } catch (whatsappErr) {
        console.error('WhatsApp send failed:', whatsappErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, recipients: recipients.length }), {
      status: 200,
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('fleet-notify error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }
});
