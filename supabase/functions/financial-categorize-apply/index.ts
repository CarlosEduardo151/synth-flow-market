// Categoriza transações financeiras pendentes do usuário e grava no campo `category`.
// Fluxo: autentica usuário -> busca transações sem categoria do customer_product_id -> chama Groq -> UPDATE em massa.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const GROQ_MODEL = Deno.env.get("GROQ_CATEGORIZE_MODEL") || "llama-3.3-70b-versatile";

const CATEGORIES = [
  "Infraestrutura", "Marketing", "Folha de Pagamento", "Impostos",
  "Software/SaaS", "Lazer", "Alimentação", "Transporte", "Moradia",
  "Saúde", "Educação", "Vendas", "Serviços Profissionais",
  "Equipamentos", "Investimentos", "Outros",
] as const;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "invalid_token" }, 401);
    const userId = userData.user.id;

    const { customer_product_id, limit = 50 } = await req.json().catch(() => ({}));
    if (!customer_product_id) return json({ error: "missing_customer_product_id" }, 400);

    // Verifica posse
    const { data: cp } = await admin
      .from("customer_products")
      .select("id, user_id")
      .eq("id", customer_product_id)
      .maybeSingle();
    if (!cp || cp.user_id !== userId) return json({ error: "forbidden" }, 403);

    // Busca pendentes
    const { data: txs, error: txErr } = await admin
      .from("financial_agent_transactions")
      .select("id, description, amount, type, category")
      .eq("customer_product_id", customer_product_id)
      .or("category.is.null,category.eq.")
      .not("description", "is", null)
      .limit(limit);

    if (txErr) throw txErr;
    const targets = (txs || []).filter((t) => (t.description || "").trim().length > 0);
    if (targets.length === 0) {
      return json({ ok: true, updated: 0, message: "no_pending" });
    }

    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");

    const prompt =
      `Categorize cada transação financeira abaixo. Use APENAS uma destas categorias: ${CATEGORIES.join(", ")}.\n\n` +
      targets.map((it, i) => `${i + 1}. [${it.type}] R$${it.amount} - ${it.description || "(sem descrição)"}`).join("\n");

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "Você é um classificador financeiro preciso. Sempre responda via tool call." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "categorize",
            description: "Retorna a categoria de cada transação na ordem recebida.",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "number" },
                      category: { type: "string", enum: [...CATEGORIES] },
                      confidence: { type: "number", minimum: 0, maximum: 1 },
                    },
                    required: ["index", "category", "confidence"],
                  },
                },
              },
              required: ["results"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "categorize" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Groq error", resp.status, t);
      return json({ error: "ai_error", status: resp.status }, 502);
    }
    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { results: [] };

    let updated = 0;
    const updates: { id: string; category: string }[] = [];
    for (const r of parsed.results || []) {
      const tgt = targets[r.index - 1];
      if (!tgt || !r.category) continue;
      updates.push({ id: tgt.id, category: r.category });
    }

    // Atualiza em paralelo (pequenos lotes)
    const results = await Promise.all(
      updates.map((u) =>
        admin.from("financial_agent_transactions")
          .update({ category: u.category })
          .eq("id", u.id)
          .eq("customer_product_id", customer_product_id)
      ),
    );
    updated = results.filter((r) => !r.error).length;

    return json({ ok: true, updated, total: targets.length });
  } catch (e) {
    console.error("apply categorize error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
