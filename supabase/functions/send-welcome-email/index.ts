import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  type: 'welcome' | 'password-reset' | 'security-alert';
  userName?: string;
  resetLink?: string;
  alertType?: string;
  alertDetails?: string;
}

const getWelcomeEmailHtml = (userName: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo à StarAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(168, 85, 247, 0.2);">
          
          <!-- Header with animated gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%); padding: 50px 40px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; display: inline-block;">
                <img src="https://i.ibb.co/PtR6n4B/starailogo.png" alt="StarAI Logo" width="120" style="margin-bottom: 20px;">
                <h1 style="color: #ffffff; font-size: 32px; margin: 0; font-weight: 700; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                  🚀 Bem-vindo à StarAI!
                </h1>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <p style="color: #e0e0e0; font-size: 18px; line-height: 1.8; margin: 0 0 25px;">
                Olá <strong style="color: #a855f7;">${userName}</strong>,
              </p>
              
              <p style="color: #b0b0b0; font-size: 16px; line-height: 1.8; margin: 0 0 30px;">
                Sua conta foi criada com sucesso! Agora você tem acesso a um universo de soluções inteligentes para transformar seu negócio.
              </p>
              
              <!-- Features Grid -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 35px;">
                <tr>
                  <td style="padding: 15px; background: rgba(168, 85, 247, 0.1); border-radius: 16px; margin-bottom: 15px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50" valign="top">
                          <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 12px; text-align: center; line-height: 45px; font-size: 20px;">
                            🤖
                          </div>
                        </td>
                        <td style="padding-left: 15px;">
                          <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 5px; font-weight: 600;">Automação Inteligente</h3>
                          <p style="color: #9ca3af; font-size: 14px; margin: 0;">Agentes de IA que trabalham 24/7</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 15px;"></td></tr>
                <tr>
                  <td style="padding: 15px; background: rgba(236, 72, 153, 0.1); border-radius: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50" valign="top">
                          <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #ec4899, #f472b6); border-radius: 12px; text-align: center; line-height: 45px; font-size: 20px;">
                            📊
                          </div>
                        </td>
                        <td style="padding-left: 15px;">
                          <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 5px; font-weight: 600;">Dashboards Inteligentes</h3>
                          <p style="color: #9ca3af; font-size: 14px; margin: 0;">Visualize dados em tempo real</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 15px;"></td></tr>
                <tr>
                  <td style="padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50" valign="top">
                          <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #3b82f6, #60a5fa); border-radius: 12px; text-align: center; line-height: 45px; font-size: 20px;">
                            💬
                          </div>
                        </td>
                        <td style="padding-left: 15px;">
                          <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 5px; font-weight: 600;">Suporte Premium</h3>
                          <p style="color: #9ca3af; font-size: 14px; margin: 0;">Atendimento personalizado</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="https://starai.com.br/customer" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 18px 45px; border-radius: 14px; font-size: 16px; font-weight: 600; box-shadow: 0 10px 30px -10px rgba(168, 85, 247, 0.5); transition: all 0.3s ease;">
                      Acessar Minha Conta →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.3); padding: 35px 40px; text-align: center; border-top: 1px solid rgba(168, 85, 247, 0.2);">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px;">
                © 2024 StarAI - Todos os direitos reservados
              </p>
              <p style="color: #4b5563; font-size: 12px; margin: 0;">
                Este email foi enviado para ${userName}. Se você não criou uma conta, ignore este email.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const getPasswordResetEmailHtml = (userName: string, resetLink: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinição de Senha - StarAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(251, 191, 36, 0.2);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%); padding: 50px 40px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; display: inline-block;">
                <img src="https://i.ibb.co/PtR6n4B/starailogo.png" alt="StarAI Logo" width="100" style="margin-bottom: 15px;">
                <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700;">
                  🔐 Redefinição de Senha
                </h1>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <p style="color: #e0e0e0; font-size: 18px; line-height: 1.8; margin: 0 0 25px;">
                Olá <strong style="color: #fbbf24;">${userName}</strong>,
              </p>
              
              <p style="color: #b0b0b0; font-size: 16px; line-height: 1.8; margin: 0 0 30px;">
                Recebemos uma solicitação para redefinir a senha da sua conta StarAI. Clique no botão abaixo para criar uma nova senha:
              </p>
              
              <!-- Security Warning -->
              <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 16px; padding: 20px; margin-bottom: 30px;">
                <p style="color: #fbbf24; font-size: 14px; margin: 0; display: flex; align-items: center;">
                  ⚠️ <span style="margin-left: 10px;">Este link expira em 1 hora por motivos de segurança.</span>
                </p>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: #0a0a0a; text-decoration: none; padding: 18px 45px; border-radius: 14px; font-size: 16px; font-weight: 700; box-shadow: 0 10px 30px -10px rgba(251, 191, 36, 0.5);">
                      Redefinir Minha Senha →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; margin: 35px 0 0; text-align: center;">
                Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá a mesma.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.3); padding: 35px 40px; text-align: center; border-top: 1px solid rgba(251, 191, 36, 0.2);">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px;">
                © 2024 StarAI - Todos os direitos reservados
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const getSecurityAlertEmailHtml = (userName: string, alertType: string, alertDetails: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Segurança - StarAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.2);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #dc2626 100%); padding: 50px 40px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; display: inline-block;">
                <img src="https://i.ibb.co/PtR6n4B/starailogo.png" alt="StarAI Logo" width="100" style="margin-bottom: 15px;">
                <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700;">
                  🛡️ Alerta de Segurança
                </h1>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <p style="color: #e0e0e0; font-size: 18px; line-height: 1.8; margin: 0 0 25px;">
                Olá <strong style="color: #ef4444;">${userName}</strong>,
              </p>
              
              <p style="color: #b0b0b0; font-size: 16px; line-height: 1.8; margin: 0 0 30px;">
                Detectamos uma atividade importante na sua conta:
              </p>
              
              <!-- Alert Box -->
              <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; padding: 25px; margin-bottom: 30px;">
                <h3 style="color: #ef4444; font-size: 18px; margin: 0 0 10px; font-weight: 600;">
                  ${alertType}
                </h3>
                <p style="color: #d1d5db; font-size: 15px; margin: 0;">
                  ${alertDetails}
                </p>
              </div>
              
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 25px;">
                Se você realizou esta ação, pode ignorar este email. Caso contrário, recomendamos:
              </p>
              
              <!-- Security Tips -->
              <ul style="color: #d1d5db; font-size: 14px; padding-left: 20px; margin: 0 0 30px;">
                <li style="margin-bottom: 10px;">Altere sua senha imediatamente</li>
                <li style="margin-bottom: 10px;">Verifique dispositivos conectados</li>
                <li style="margin-bottom: 10px;">Entre em contato com nosso suporte</li>
              </ul>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="https://starai.com.br/customer/settings" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; text-decoration: none; padding: 18px 45px; border-radius: 14px; font-size: 16px; font-weight: 600; box-shadow: 0 10px 30px -10px rgba(239, 68, 68, 0.5);">
                      Verificar Minha Conta →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.3); padding: 35px 40px; text-align: center; border-top: 1px solid rgba(239, 68, 68, 0.2);">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px;">
                © 2024 StarAI - Segurança é nossa prioridade
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  console.log("send-welcome-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, type, userName, resetLink, alertType, alertDetails }: EmailRequest = await req.json();
    
    console.log(`Sending ${type} email to: ${to}`);
    
    let subject = "";
    let html = "";
    const name = userName || to.split("@")[0];
    
    switch (type) {
      case "welcome":
        subject = "🚀 Bem-vindo à StarAI - Sua conta foi criada!";
        html = getWelcomeEmailHtml(name);
        break;
      case "password-reset":
        subject = "🔐 Redefinição de Senha - StarAI";
        html = getPasswordResetEmailHtml(name, resetLink || "https://starai.com.br/auth");
        break;
      case "security-alert":
        subject = "🛡️ Alerta de Segurança - StarAI";
        html = getSecurityAlertEmailHtml(name, alertType || "Atividade detectada", alertDetails || "Uma atividade foi detectada na sua conta.");
        break;
      default:
        throw new Error("Invalid email type");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "StarAI <noreply@verification.starai.com.br>",
        to: [to],
        subject,
        html,
      }),
    });

    const emailData = await emailResponse.json();

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
