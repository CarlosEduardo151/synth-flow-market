import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'all' | 'specific';
  email?: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create authenticated Supabase client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      throw new Error('Unauthorized: No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized: Invalid user');
    }

    console.log('User authenticated:', user.id);

    // Check if user is admin using the is_admin function
    const { data: isAdminData, error: adminError } = await supabaseClient
      .rpc('is_admin', { user_id: user.id });

    if (adminError) {
      console.error('Admin check error:', adminError);
      throw new Error('Error checking admin status');
    }

    if (!isAdminData) {
      console.error('User is not admin:', user.id);
      throw new Error('Unauthorized: Admin access required');
    }

    console.log('Admin verified, processing notification request');

    const { type, email, subject, message }: NotificationRequest = await req.json();

    let recipients: string[] = [];

    if (type === 'all') {
      // Get all customer emails
      const { data: profiles, error } = await supabaseClient
        .from('profiles')
        .select('email')
        .not('email', 'is', null);

      if (error) {
        console.error('Error fetching profiles:', error);
        throw error;
      }
      
      recipients = profiles.map(p => p.email).filter(Boolean);
      console.log(`Found ${recipients.length} recipients for bulk notification`);
    } else if (type === 'specific') {
      if (!email) {
        throw new Error('Email is required for specific notification');
      }
      recipients = [email];
      console.log(`Sending notification to specific email: ${email}`);
    }

    if (recipients.length === 0) {
      throw new Error('No recipients found');
    }

    // Send emails
    console.log(`Sending notifications to ${recipients.length} recipients`);
    const emailPromises = recipients.map(recipient =>
      resend.emails.send({
        from: "Notificações <onboarding@resend.dev>",
        to: [recipient],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${subject}</h2>
            <div style="margin: 20px 0; white-space: pre-wrap;">${message}</div>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 14px;">
              Esta é uma notificação automática. Por favor, não responda a este email.
            </p>
          </div>
        `,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    console.log(`Notifications sent: ${successCount} successful, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
