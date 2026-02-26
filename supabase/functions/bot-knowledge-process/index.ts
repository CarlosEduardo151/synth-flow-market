import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";

/**
 * Bot Knowledge Base Processor
 * 
 * Actions:
 * - scrape_website: Fetches and extracts text content from a URL
 * - process_text: Stores plain text knowledge entry
 */

serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
  if (req.method !== "POST") return corsResponse({ error: "method_not_allowed" }, 405, origin);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return corsResponse({ error: "unauthorized" }, 401, origin);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (userErr || !userId) return corsResponse({ error: "unauthorized" }, 401, origin);

    const body = await req.json().catch(() => ({}));
    const { action, customer_product_id, url, title, content, knowledge_id } = body;

    if (!customer_product_id) {
      return corsResponse({ error: "customer_product_id required" }, 400, origin);
    }

    // Verify ownership
    const { data: cp } = await supabase
      .from("customer_products")
      .select("id")
      .eq("id", customer_product_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!cp) return corsResponse({ error: "forbidden" }, 403, origin);

    const service = createClient(supabaseUrl, serviceKey);

    if (action === "scrape_website") {
      if (!url) return corsResponse({ error: "url required" }, 400, origin);

      // Create entry with processing status
      const entryTitle = title || new URL(url).hostname;
      const { data: entry, error: insertErr } = await service
        .from("bot_knowledge_base")
        .insert({
          customer_product_id,
          entry_type: "website",
          title: entryTitle,
          source_url: url,
          status: "processing",
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      // Scrape the website
      try {
        const resp = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; StarAI Bot/1.0)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });

        if (!resp.ok) throw new Error(`fetch_failed:${resp.status}`);

        const html = await resp.text();
        
        // Extract text content from HTML (simple but effective)
        const textContent = extractTextFromHTML(html);
        const truncated = textContent.slice(0, 100_000); // Max 100KB of text

        await service
          .from("bot_knowledge_base")
          .update({
            content: truncated,
            status: "ready",
            file_size_bytes: new TextEncoder().encode(truncated).length,
            metadata: {
              original_url: url,
              scraped_at: new Date().toISOString(),
              content_length: truncated.length,
            },
          })
          .eq("id", entry.id);

        return corsResponse({ ok: true, id: entry.id, content_length: truncated.length }, 200, origin);
      } catch (e) {
        await service
          .from("bot_knowledge_base")
          .update({
            status: "error",
            error_message: e instanceof Error ? e.message : "unknown_error",
          })
          .eq("id", entry.id);

        return corsResponse({ ok: false, error: e instanceof Error ? e.message : "scrape_failed" }, 500, origin);
      }
    }

    if (action === "save_text") {
      if (!content || !title) return corsResponse({ error: "title and content required" }, 400, origin);

      const { data: entry, error: insertErr } = await service
        .from("bot_knowledge_base")
        .insert({
          customer_product_id,
          entry_type: "text",
          title,
          content: content.slice(0, 100_000),
          status: "ready",
          file_size_bytes: new TextEncoder().encode(content).length,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      return corsResponse({ ok: true, id: entry.id }, 200, origin);
    }

    if (action === "delete") {
      if (!knowledge_id) return corsResponse({ error: "knowledge_id required" }, 400, origin);

      await service
        .from("bot_knowledge_base")
        .delete()
        .eq("id", knowledge_id)
        .eq("customer_product_id", customer_product_id);

      return corsResponse({ ok: true }, 200, origin);
    }

    if (action === "process_file") {
      // File is already uploaded to storage, just update the entry with extracted content
      if (!knowledge_id) return corsResponse({ error: "knowledge_id required" }, 400, origin);

      const { data: entry } = await service
        .from("bot_knowledge_base")
        .select("*")
        .eq("id", knowledge_id)
        .single();

      if (!entry) return corsResponse({ error: "entry_not_found" }, 404, origin);

      // For text-based files, try to read the content from storage
      try {
        const filePath = `${userId}/${customer_product_id}/${entry.file_name}`;
        const { data: fileData, error: dlErr } = await service.storage
          .from("bot_knowledge")
          .download(filePath);

        if (dlErr) throw dlErr;

        let textContent = "";
        const mime = entry.file_mime_type || "";

        if (mime.includes("text") || mime.includes("csv") || mime.includes("json") || mime.includes("xml")) {
          textContent = await fileData.text();
        } else if (mime.includes("spreadsheet") || mime.includes("excel") || entry.file_name?.endsWith(".xlsx") || entry.file_name?.endsWith(".xls")) {
          // For spreadsheets, store raw text representation
          textContent = await fileData.text().catch(() => "");
          if (!textContent) textContent = `[Planilha: ${entry.file_name}] — Conteúdo binário não extraível diretamente.`;
        } else if (mime.includes("pdf")) {
          textContent = `[PDF: ${entry.file_name}] — Conteúdo será processado pela IA quando necessário.`;
        } else {
          textContent = `[Arquivo: ${entry.file_name}] (${mime}) — Conteúdo armazenado.`;
        }

        await service
          .from("bot_knowledge_base")
          .update({
            content: textContent.slice(0, 100_000),
            status: "ready",
          })
          .eq("id", knowledge_id);

        return corsResponse({ ok: true }, 200, origin);
      } catch (e) {
        await service
          .from("bot_knowledge_base")
          .update({
            status: "error",
            error_message: e instanceof Error ? e.message : "process_failed",
          })
          .eq("id", knowledge_id);

        return corsResponse({ ok: false, error: "process_failed" }, 500, origin);
      }
    }

    return corsResponse({ error: "invalid_action" }, 400, origin);
  } catch (error) {
    console.error("bot-knowledge-process error:", error);
    return corsResponse({ error: "internal_error" }, 500, origin);
  }
});

function extractTextFromHTML(html: string): string {
  // Remove script and style tags with content
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&[a-z]+;/gi, " ");
  
  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  return text;
}
