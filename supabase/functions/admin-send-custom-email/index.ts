import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailBlock {
  type: "heading" | "paragraph" | "button" | "image";
  content: string;
  color?: string;
  backgroundColor?: string;
  buttonUrl?: string;
  imageUrl?: string;
}

interface SendCustomEmailRequest {
  recipientUserIds?: string[];
  recipientEmails?: string[];
  subject: string;
  blocks: EmailBlock[];
  fromName?: string;
  fromEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userError || !userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Check if admin
    const { data: roleData, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendCustomEmailRequest = await req.json();
    const { recipientUserIds, recipientEmails, subject, blocks, fromName, fromEmail } = body;

    // 3) Validations
    if ((!recipientUserIds || recipientUserIds.length === 0) && (!recipientEmails || recipientEmails.length === 0)) {
      return new Response(JSON.stringify({ error: "No recipients" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject || !blocks || blocks.length === 0) {
      return new Response(JSON.stringify({ error: "Subject and blocks required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Resolve emails from userIds if needed
    let finalEmails: string[] = recipientEmails || [];
    if (recipientUserIds && recipientUserIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("email")
        .in("user_id", recipientUserIds);

      if (!profilesError && profilesData) {
        finalEmails = [...finalEmails, ...profilesData.map((p: any) => p.email).filter(Boolean)];
      }
    }

    if (finalEmails.length === 0) {
      return new Response(JSON.stringify({ error: "No valid emails resolved" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Build HTML from blocks
    const htmlBody = buildHtmlFromBlocks(blocks);

    // 6) Send via Resend API (no npm deps)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resend: para enviar para qualquer destinatário, o "from" precisa usar um domínio verificado.
    // Agora que o domínio está verificado, usamos um remetente padrão no seu domínio.
    const safeFromName = (fromName || "StarAI").trim() || "StarAI";
    const safeFromEmail = (fromEmail || "noreply@starai.com.br").trim() || "noreply@starai.com.br";
    const from = `${safeFromName} <${safeFromEmail}>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: finalEmails,
        subject,
        html: htmlBody,
      }),
    });

    const resText = await res.text();
    if (!res.ok) {
      console.error("Resend error:", res.status, resText);
      return new Response(JSON.stringify({ error: "Resend failed", details: resText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resendId: string | undefined;
    try {
      const parsed = JSON.parse(resText);
      resendId = parsed?.id;
    } catch {
      // ignore
    }

    return new Response(JSON.stringify({ success: true, sentTo: finalEmails.length, resendId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in admin-send-custom-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

function buildHtmlFromBlocks(blocks: EmailBlock[]): string {
  let html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
`;

  blocks.forEach((block) => {
    const color = block.color || "#000";
    const bgColor = block.backgroundColor || "transparent";

    if (block.type === "heading") {
      html += `<h2 style="color:${color}; background-color:${bgColor}; padding:10px;">${block.content}</h2>\n`;
    } else if (block.type === "paragraph") {
      html += `<p style="color:${color}; background-color:${bgColor}; padding:10px;">${block.content}</p>\n`;
    } else if (block.type === "button" && block.buttonUrl) {
      html += `
<div style="text-align:center; margin:15px 0;">
  <a href="${block.buttonUrl}" style="display:inline-block; padding:12px 24px; color:#fff; background-color:${color}; text-decoration:none; border-radius:5px;">
    ${block.content}
  </a>
</div>\n`;
    } else if (block.type === "image" && block.imageUrl) {
      html += `<div style="text-align:center; margin:15px 0;"><img src="${block.imageUrl}" alt="${block.content}" style="max-width:100%; height:auto;" /></div>\n`;
    }
  });

  html += `
  </div>
</body>
</html>
`;
  return html;
}

serve(handler);