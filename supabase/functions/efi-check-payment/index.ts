import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { efiRequest } from '../_shared/efi.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { txid, payment_id } = await req.json();
    if (!txid) throw new Error('txid is required');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const charge = await efiRequest<any>(`/v2/cob/${txid}`, { method: 'GET' });
    const efiStatus = charge.status; // ATIVA | CONCLUIDA | REMOVIDA_PELO_USUARIO_RECEBEDOR | REMOVIDA_PELO_PSP

    let internalStatus = 'pending';
    if (efiStatus === 'CONCLUIDA') internalStatus = 'paid';
    else if (efiStatus?.startsWith('REMOVIDA')) internalStatus = 'cancelled';

    if (payment_id) {
      await supabaseClient
        .from('mp_payments')
        .update({ status: internalStatus })
        .eq('id', payment_id);

      if (internalStatus === 'paid') {
        const { data: pmt } = await supabaseClient
          .from('mp_payments')
          .select('order_id')
          .eq('id', payment_id)
          .single();
        if (pmt?.order_id) {
          await supabaseClient
            .from('mp_orders')
            .update({ status: 'paid' })
            .eq('id', pmt.order_id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: internalStatus, efi_status: efiStatus, charge }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
