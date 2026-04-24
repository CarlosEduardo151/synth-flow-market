/**
 * Anti-Ban Protocols for WhatsApp Automation
 * ==========================================
 * Aplicado ao produto "bots-automacao" para simular comportamento humano
 * e reduzir risco de banimento pela Meta.
 *
 * Protocolos:
 *  1. Simulação de Presença: markRead + composing antes de enviar.
 *  2. Delays Aleatórios proporcionais ao tamanho do texto.
 *  3. Variabilidade nas Respostas (variação leve de saudações).
 *  4. Step-by-step: split de respostas longas em múltiplas mensagens
 *     com pequenos intervalos entre elas.
 */

export const ANTI_BAN_PRODUCT_SLUG = "bots-automacao";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Atraso humanizado proporcional ao tamanho do texto + jitter.
 * Otimizado para resposta rápida mantendo aparência humana.
 * - Base: 1s a cada 60 caracteres (~ velocidade de digitação rápida)
 * - Jitter: 0.4 a 1.2 segundos
 * - Mínimo: 700ms, Máximo: 3.5s
 */
export function computeHumanDelayMs(text: string): number {
  const len = text?.length || 0;
  const base = (len / 60) * 1000;
  const jitter = 400 + Math.random() * 800; // 0.4..1.2s
  const total = base + jitter;
  return Math.min(Math.max(total, 700), 3500);
}

/**
 * Pequeno delay entre fragmentos de uma mesma resposta (step-by-step).
 */
export function computeInterChunkDelayMs(): number {
  return 300 + Math.floor(Math.random() * 500); // 0.3..0.8s
}

/**
 * Quebra um texto longo em pedaços naturais (por parágrafo / frase) para
 * evitar disparar tudo em uma única mensagem (padrão de bot).
 * Limita o número de chunks para não inundar o cliente.
 */
export function splitMessageIntoChunks(text: string, maxChunks = 3): string[] {
  if (!text || text.length <= 400) return [text];

  // Split por parágrafos primeiro
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length > 1 && paragraphs.length <= maxChunks) {
    return paragraphs;
  }

  // Fallback: split por frases agrupadas
  const sentences = text.match(/[^.!?\n]+[.!?]+|\S[^.!?\n]*$/g) || [text];
  const chunks: string[] = [];
  const targetSize = Math.ceil(text.length / maxChunks);
  let current = "";

  for (const s of sentences) {
    if ((current + " " + s).trim().length > targetSize && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = (current + " " + s).trim();
    }
    if (chunks.length >= maxChunks - 1) {
      // último chunk acumula o resto
      current = (current + " " + sentences.slice(sentences.indexOf(s) + 1).join(" ")).trim();
      break;
    }
  }
  if (current) chunks.push(current);

  return chunks.filter(Boolean).slice(0, maxChunks);
}

/**
 * Aplica variabilidade leve em respostas curtas / saudações para evitar
 * que o bot envie sempre exatamente o mesmo texto. Não toca em respostas
 * longas (mantém intacto o conteúdo gerado pela IA).
 */
const GREETING_VARIANTS: Record<string, string[]> = {
  hello: ["Olá!", "Oi, tudo bem?", "Opa, como vai?", "Olá, tudo certo?", "Oi!"],
  thanks: ["De nada!", "Imagina!", "Por nada 😊", "Disponha!", "Estou aqui pra ajudar!"],
  ok: ["Combinado!", "Perfeito!", "Beleza!", "Ok, anotado!", "Tudo certo!"],
};

const GREETING_PATTERNS: Array<{ key: keyof typeof GREETING_VARIANTS; regex: RegExp }> = [
  { key: "hello", regex: /^(ol[áa]!?|oi!?|opa!?)[\s,.!?]*$/i },
  { key: "thanks", regex: /^(de nada!?|por nada!?|imagina!?)[\s,.!?]*$/i },
  { key: "ok", regex: /^(ok!?|beleza!?|combinado!?|perfeito!?)[\s,.!?]*$/i },
];

export function applyResponseVariability(text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (trimmed.length > 60) return text; // só varia respostas curtas

  for (const { key, regex } of GREETING_PATTERNS) {
    if (regex.test(trimmed)) {
      const variants = GREETING_VARIANTS[key];
      return variants[Math.floor(Math.random() * variants.length)];
    }
  }
  return text;
}

/**
 * Verifica se o customer_product está vinculado ao produto "bots-automacao".
 * Retorna true apenas para esse produto — outros bots da plataforma seguem
 * o fluxo padrão sem os protocolos anti-ban.
 */
export async function isAntiBanEnabled(
  service: any,
  customerProductId: string,
): Promise<boolean> {
  try {
    const { data, error } = await service
      .from("customer_products")
      .select("product_slug")
      .eq("id", customerProductId)
      .maybeSingle();
    if (error) {
      console.warn("[anti-ban] product_slug lookup error:", error.message);
      return false;
    }
    return data?.product_slug === ANTI_BAN_PRODUCT_SLUG;
  } catch (e) {
    console.warn("[anti-ban] enabled-check failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
