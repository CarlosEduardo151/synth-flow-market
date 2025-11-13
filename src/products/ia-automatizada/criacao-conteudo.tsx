import { Product } from '@/types/product';

export const criacaoConteudo: Product = {
  title: "Criação de Conteúdo com IA",
  slug: "criacao-conteudo",
  price: 40000, // R$ 400,00/mês em centavos
  category: "ia-automatizada",
  images: ["/images/produtos/criacao-conteudo.png"],
  short: "Geração de textos, imagens e vídeos para redes sociais e blogs, sempre originais e otimizados para engajamento.",
  badges: ["Assinatura Mensal", "Original"],
  features: [
    "Textos criados por IA",
    "Imagens geradas automaticamente",
    "Vídeos curtos para redes sociais",
    "Otimização para engajamento",
    "Calendário editorial",
    "SEO integrado",
    "Múltiplos formatos",
    "Conteúdo original sempre"
  ],
  inStock: true,
  delivery: "Ativação em 48 horas",
  specs: "Pagamento Mensal - R$ 400/mês",
  content: `
# Criação de Conteúdo com IA

Conteúdo profissional e original criado automaticamente por IA.

## O que você recebe

- Textos para blog e redes sociais
- Imagens únicas geradas por IA
- Vídeos curtos para reels e stories
- Calendário editorial completo

## Vantagens

- Presença digital consistente
- Conteúdo sempre original
- Otimizado para engajamento
- Economia de tempo e recursos

## Para quem é

Empresas que precisam de conteúdo constante e profissional sem manter equipe criativa interna.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
