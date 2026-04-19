// Categoriza transações financeiras automaticamente via Groq
// Recebe lista de descrições e retorna categoria + subcategoria para cada uma
import { corsHeaders } from "../_shared/cors.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_MODEL = Deno.env.get("GROQ_CATEGORIZE_MODEL") || "llama-3.3-70b-versatile";

const CATEGORIES = [
  "Infraestrutura", "Marketing", "Folha de Pagamento", "Impostos",
  "Software/SaaS", "Lazer", "Alimentação", "Transporte", "Moradia",
  "Saúde", "Educação", "Vendas", "Serviços Profissionais",
  "Equipamentos", "Investimentos", "Outros",
] as const;

interface ReqBody {
  items: { id: string; description: string; amount: number; type: "income" | "expense" }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
    const { items } = (await req.json()) as ReqBody;
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt =
      `Categorize cada transação financeira abaixo. Use APENAS uma destas categorias: ${CATEGORIES.join(", ")}.\n\n` +
      items.map((it, i) => `${i + 1}. [${it.type}] R$${it.amount} - ${it.description || "(sem descrição)"}`).join("\n");

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
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
      console.error("AI gateway error:", resp.status, t);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI ${resp.status}`);
    }

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { results: [] };
    const enriched = (parsed.results || []).map((r: any) => ({
      id: items[r.index - 1]?.id ?? null,
      category: r.category,
      confidence: r.confidence,
    }));

    return new Response(JSON.stringify({ results: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("categorize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
