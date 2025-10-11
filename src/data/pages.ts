export interface Page {
  title: string;
  slug: string;
  content?: string;
}

export const pages: Page[] = [
  {
    title: "Sobre",
    slug: "sobre",
    content: `## Quem somos
Somos especialistas em IA aplicada a negócios. Nosso foco é eficiência e automação.

### Missão
Levar agentes inteligentes a empresas de todos os portes.

### Visão
Democratizar o acesso à inteligência artificial através de soluções práticas e acessíveis.

### Valores
- **Inovação**: Sempre na vanguarda da tecnologia
- **Simplicidade**: Soluções complexas com interfaces simples
- **Eficiência**: Resultados mensuráveis para nossos clientes`
  }
];

export function getPages(): Page[] {
  return pages;
}

export function getPage(slug: string): Page | null {
  return pages.find(page => page.slug === slug) || null;
}