export type AIProvider = "lovable" | "openai" | "gemini";

export const AI_PROVIDERS: Array<{
  value: AIProvider;
  label: string;
  description?: string;
  needsKey?: boolean;
}> = [
  {
    value: "lovable",
    label: "Padrão (Lovable)",
    description: "Usa o gateway integrado (não precisa de chave).",
    needsKey: false,
  },
  {
    value: "openai",
    label: "OpenAI (ChatGPT)",
    description: "Use sua chave da OpenAI para modelos GPT.",
    needsKey: true,
  },
  {
    value: "gemini",
    label: "Google Gemini",
    description: "Use sua chave do Google AI Studio para modelos Gemini.",
    needsKey: true,
  },
];

export const GLOBAL_AI_PRODUCT_SLUG = "__global__";
