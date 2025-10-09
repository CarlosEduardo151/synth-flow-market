# TechIA Store - Loja de Produtos de IA

Uma loja moderna e futurista para produtos de tecnologia em inteligência artificial, construída com React, TypeScript e Tailwind CSS.

## 🚀 Características

- **Design Futurista**: Interface moderna com gradientes azul escuro → preto e efeitos de glassmorphism
- **Sistema de Conteúdo em Markdown**: Gestão de categorias, produtos e páginas via arquivos `.md`
- **Responsivo**: Layout adaptativo para todos os dispositivos
- **Animações Suaves**: Transições elegantes com Framer Motion
- **SEO Otimizado**: Meta tags e estrutura semântica

## 🛠️ Tecnologias

- **React 18** com TypeScript
- **Tailwind CSS** para estilização
- **Framer Motion** para animações
- **Lucide React** para ícones
- **Gray Matter** para processamento de Markdown
- **Remark** para renderização de HTML

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── layout/          # Header e Footer
│   ├── ui/              # Componentes shadcn/ui
│   └── ProductCard.tsx  # Card de produto
├── lib/
│   └── markdown.ts      # Sistema de conteúdo
├── pages/
│   ├── Index.tsx        # Página inicial
│   ├── CategoryPage.tsx # Página de categoria
│   └── ProductPage.tsx  # Página de produto
└── assets/              # Imagens geradas

content/
├── categories/          # Categorias em .md
├── products/           # Produtos em .md
└── pages/              # Páginas institucionais
```

## 📝 Como Criar Conteúdo

### Nova Categoria

Crie um arquivo `content/categories/<slug>.md`:

```markdown
---
title: "Nome da Categoria"
slug: "slug-da-categoria"
icon: "Bot" # ícone do lucide-react (Bot, Cpu, etc.)
summary: "Descrição da categoria"
order: 1
---

Conteúdo opcional em markdown.
```

### Novo Produto

Crie um arquivo `content/products/<slug>.md`:

```markdown
---
title: "Nome do Produto"
slug: "slug-do-produto"
price: 49900 # preço em centavos (R$ 499,00)
category: "slug-da-categoria"
images:
  - "/images/produtos/produto1.png"
  - "/images/produtos/produto1b.png"
short: "Descrição resumida do produto"
badges: ["Digital", "Entrega imediata"]
features:
  - "Recurso 1"
  - "Recurso 2"
  - "Recurso 3"
inStock: true
delivery: "digital"
specs: |
  ## Especificações Técnicas
  - Compatibilidade: WhatsApp, E-mail
  - Integração: APIs REST
  - Suporte: 24/7
---

### Descrição Completa

Conteúdo detalhado do produto em markdown.
```

### Nova Página Institucional

Crie um arquivo `content/pages/<slug>.md`:

```markdown
---
title: "Título da Página"
slug: "slug-da-pagina"
---

# Conteúdo da Página

Seu conteúdo em markdown aqui.
```

## 🎨 Design System

O projeto utiliza um design system completo com:

- **Cores Futuristas**: Gradientes azul cibernético → ciano
- **Componentes Customizados**: Variantes especiais para botões (hero, purchase, info)
- **Efeitos Visuais**: Glassmorphism, sombras com glow, animações tech
- **Tipografia**: Fonte system com peso balanceado

### Variantes de Botão

```tsx
// Botão principal/hero
<Button variant="hero">Explorar produtos</Button>

// Botão de compra
<Button variant="purchase">Comprar agora</Button>

// Botão de informações
<Button variant="info">Detalhes</Button>
```

## 🔧 Configuração

1. **Instalar dependências**:
```bash
npm install
```

2. **Iniciar desenvolvimento**:
```bash
npm run dev
```

3. **Build para produção**:
```bash
npm run build
```

## 📊 Funcionalidades Implementadas

- ✅ Sistema de categorias dinâmicas
- ✅ Catálogo de produtos responsivo
- ✅ Páginas de produto detalhadas
- ✅ Galeria de imagens
- ✅ Breadcrumbs de navegação
- ✅ Sistema de badges e status
- ✅ Formatação de preços em R$
- ✅ Modais de especificações
- ✅ Design futurista completo

## 🔮 Próximas Funcionalidades

- [ ] Sistema de autenticação
- [ ] Carrinho de compras
- [ ] Pagamentos PIX (Mercado Pago)
- [ ] Painel administrativo
- [ ] Sistema de busca
- [ ] Avaliações e comentários

## 📱 Responsividade

O layout é totalmente responsivo com:
- Grid adaptativo para produtos
- Navigation menu colapsável
- Imagens otimizadas
- Touch-friendly na mobile

## 🎯 SEO

- Meta tags dinâmicas
- Estrutura semântica HTML5
- URLs amigáveis
- Schema markup ready

---

Desenvolvido com ❤️ usando tecnologias modernas para o futuro da IA.