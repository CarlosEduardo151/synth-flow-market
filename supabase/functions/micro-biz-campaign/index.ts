/**
 * MICRO-BIZ CAMPAIGN ENGINE
 * Gerencia campanhas Meta Ads: criação, publicação e status.
 * Fluxo: Creative aprovado → Criar campanha → (futuro) Publicar via Meta API
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest, corsResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const body = await req.json();
    const { action } = body;

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    switch (action) {
      case "create": {
        const { customer_product_id, creative_id, platform, budget_cents, duration_days, target_audience } = body;
        if (!customer_product_id || !creative_id) {
          return corsResponse({ error: "customer_product_id and creative_id required" }, 400, origin);
        }

        // Load AI config for default budget
        const { data: aiConfig } = await service
          .from("micro_biz_ai_config")
          .select("default_budget_cents, target_audience_template")
          .eq("customer_product_id", customer_product_id)
          .maybeSingle();

        const { data: campaign, error } = await service
          .from("micro_biz_campaigns")
          .insert({
            customer_product_id,
            creative_id,
            platform: platform || "instagram",
            budget_cents: budget_cents || aiConfig?.default_budget_cents || 1000,
            duration_days: duration_days || 7,
            target_audience: target_audience || aiConfig?.target_audience_template || {},
            status: "draft",
          })
          .select()
          .single();

        if (error) return corsResponse({ error: error.message }, 500, origin);
        return corsResponse({ success: true, campaign }, 200, origin);
      }

      case "publish": {
        const { campaign_id } = body;
        if (!campaign_id) return corsResponse({ error: "campaign_id required" }, 400, origin);

        // TODO: Integrar com Meta Graph API
        // Por enquanto, simula a publicação
        const { data: campaign, error } = await service
          .from("micro_biz_campaigns")
          .update({
            status: "pending_review",
            started_at: new Date().toISOString(),
          })
          .eq("id", campaign_id)
          .select()
          .single();

        if (error) return corsResponse({ error: error.message }, 500, origin);

        return corsResponse({
          success: true,
          campaign,
          message: "Campanha enviada para revisão. A integração com Meta Ads será ativada em breve.",
        }, 200, origin);
      }

      case "stats": {
        const { customer_product_id } = body;
        if (!customer_product_id) return corsResponse({ error: "customer_product_id required" }, 400, origin);

        const { data: campaigns } = await service
          .from("micro_biz_campaigns")
          .select("*, micro_biz_creatives(image_url, selected_copy)")
          .eq("customer_product_id", customer_product_id)
          .order("created_at", { ascending: false })
          .limit(20);

        const { data: leads } = await service
          .from("micro_biz_leads")
          .select("id, purchase_intent_score, is_converted")
          .eq("customer_product_id", customer_product_id);

        const totalLeads = leads?.length || 0;
        const hotLeads = leads?.filter((l) => (l.purchase_intent_score || 0) >= 7).length || 0;
        const converted = leads?.filter((l) => l.is_converted).length || 0;

        return corsResponse({
          campaigns: campaigns || [],
          stats: { totalLeads, hotLeads, converted },
        }, 200, origin);
      }

      default:
        return corsResponse({ error: `Unknown action: ${action}` }, 400, origin);
    }
  } catch (e) {
    console.error("micro-biz-campaign error:", e);
    return corsResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500, origin);
  }
});
