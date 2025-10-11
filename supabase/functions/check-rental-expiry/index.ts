import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@3.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerProduct {
  id: string;
  user_id: string;
  product_title: string;
  rental_end_date: string;
  monthly_rental_price: number;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    console.log("Verificando aluguéis próximos ao vencimento...");

    // Buscar todos os aluguéis ativos
    const { data: rentals, error: rentalsError } = await supabase
      .from("customer_products")
      .select("*")
      .eq("acquisition_type", "rental")
      .eq("is_active", true)
      .not("rental_end_date", "is", null);

    if (rentalsError) {
      console.error("Erro ao buscar aluguéis:", rentalsError);
      throw rentalsError;
    }

    console.log(`${rentals?.length || 0} aluguéis ativos encontrados`);

    // Buscar perfis dos usuários
    const userIds = rentals?.map(r => r.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    const notificationsSent: string[] = [];

    for (const rental of rentals || []) {
      if (!rental.rental_end_date) continue;

      const endDate = new Date(rental.rental_end_date);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const profile = profiles?.find(p => p.user_id === rental.user_id);
      if (!profile || !profile.email) {
        console.log(`Perfil ou email não encontrado para usuário ${rental.user_id}`);
        continue;
      }

      let shouldNotify = false;
      let notificationMessage = "";

      if (daysUntilExpiry === 7) {
        shouldNotify = true;
        notificationMessage = "7 dias";
      } else if (daysUntilExpiry === 3) {
        shouldNotify = true;
        notificationMessage = "3 dias";
      } else if (daysUntilExpiry === 1) {
        shouldNotify = true;
        notificationMessage = "1 dia";
      } else if (daysUntilExpiry === 0) {
        shouldNotify = true;
        notificationMessage = "hoje";
      } else if (daysUntilExpiry < 0) {
        shouldNotify = true;
        notificationMessage = "vencido";
      }

      if (shouldNotify) {
        console.log(`Enviando notificação para ${profile.email} - ${notificationMessage}`);

        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Aviso de Vencimento de Aluguel</h1>
              <p>Olá ${profile.full_name || 'Cliente'},</p>
              <p>Este é um lembrete de que seu aluguel do produto <strong>${rental.product_title}</strong> ${
                daysUntilExpiry < 0 
                  ? "já venceu" 
                  : daysUntilExpiry === 0 
                    ? "vence hoje" 
                    : `vence em ${notificationMessage}`
              }.</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Produto:</strong> ${rental.product_title}</p>
                <p style="margin: 5px 0;"><strong>Data de Vencimento:</strong> ${endDate.toLocaleDateString('pt-BR')}</p>
                <p style="margin: 5px 0;"><strong>Valor Mensal:</strong> R$ ${(rental.monthly_rental_price / 100).toFixed(2)}</p>
              </div>
              ${daysUntilExpiry >= 0 ? `
                <p>Para continuar usando este produto, entre em contato conosco para renovar seu aluguel.</p>
              ` : `
                <p style="color: #d32f2f;"><strong>Atenção:</strong> Seu acesso ao produto pode ser suspenso a qualquer momento. Entre em contato para regularizar.</p>
              `}
              <p>Atenciosamente,<br>Equipe de Suporte</p>
            </div>
          `;

          await resend.emails.send({
            from: "Aluguel <onboarding@resend.dev>",
            to: [profile.email],
            subject: `${daysUntilExpiry < 0 ? "⚠️ Aluguel Vencido" : "🔔 Lembrete de Vencimento"} - ${rental.product_title}`,
            html: emailHtml,
          });

          notificationsSent.push(`${profile.email} - ${notificationMessage}`);
          console.log(`✓ Email enviado para ${profile.email}`);
        } catch (emailError) {
          console.error(`Erro ao enviar email para ${profile.email}:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Verificação concluída. ${notificationsSent.length} notificações enviadas.`,
        notifications: notificationsSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro na função check-rental-expiry:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
