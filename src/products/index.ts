// Micro-Empresas
export { dashboardsPersonalizados } from './micro-empresas/dashboards-personalizados';
export { gestaoCobrancas } from './micro-empresas/gestao-cobrancas';
export { landingPages } from './micro-empresas/landing-pages';
export { postsSociais } from './micro-empresas/posts-sociais';
export { lojaVirtual } from './micro-empresas/loja-virtual';
export { crmSimples } from './micro-empresas/crm-simples';
export { relatoriosFinanceiros } from './micro-empresas/relatorios-financeiros';
export { fidelidadeDigital } from './micro-empresas/fidelidade-digital';

// IA Automatizada
export { webScraping } from './ia-automatizada/web-scraping';
export { gestaoAnuncios } from './ia-automatizada/gestao-anuncios';
export { analisePreditiva } from './ia-automatizada/analise-preditiva';
export { iaAtendimento } from './ia-automatizada/ia-atendimento';
export { automacaoEmails } from './ia-automatizada/automacao-emails';
export { precificacaoDinamica } from './ia-automatizada/precificacao-dinamica';
export { insightsMercado } from './ia-automatizada/insights-mercado';
export { criacaoConteudo } from './ia-automatizada/criacao-conteudo';

// Agentes de IA
export { botsAutomacao } from './agentes-de-ia/bots-automacao';
export { assistenteVendas } from './agentes-de-ia/assistente-vendas';
export { agenteFinanceiro } from './agentes-de-ia/agente-financeiro';
export { agenteMarketing } from './agentes-de-ia/agente-marketing';
export { agenteSuporte } from './agentes-de-ia/agente-suporte';
export { agenteRH } from './agentes-de-ia/agente-rh';
export { agenteIntegracao } from './agentes-de-ia/agente-integracao';
export { agenteConcorrencia } from './agentes-de-ia/agente-concorrencia';

import { Product } from '@/types/product';
import { dashboardsPersonalizados } from './micro-empresas/dashboards-personalizados';
import { gestaoCobrancas } from './micro-empresas/gestao-cobrancas';
import { landingPages } from './micro-empresas/landing-pages';
import { postsSociais } from './micro-empresas/posts-sociais';
import { lojaVirtual } from './micro-empresas/loja-virtual';
import { crmSimples } from './micro-empresas/crm-simples';
import { relatoriosFinanceiros } from './micro-empresas/relatorios-financeiros';
import { fidelidadeDigital } from './micro-empresas/fidelidade-digital';

import { webScraping } from './ia-automatizada/web-scraping';
import { gestaoAnuncios } from './ia-automatizada/gestao-anuncios';
import { analisePreditiva } from './ia-automatizada/analise-preditiva';
import { iaAtendimento } from './ia-automatizada/ia-atendimento';
import { automacaoEmails } from './ia-automatizada/automacao-emails';
import { precificacaoDinamica } from './ia-automatizada/precificacao-dinamica';
import { insightsMercado } from './ia-automatizada/insights-mercado';
import { criacaoConteudo } from './ia-automatizada/criacao-conteudo';

import { botsAutomacao } from './agentes-de-ia/bots-automacao';
import { assistenteVendas } from './agentes-de-ia/assistente-vendas';
import { agenteFinanceiro } from './agentes-de-ia/agente-financeiro';
import { agenteMarketing } from './agentes-de-ia/agente-marketing';
import { agenteSuporte } from './agentes-de-ia/agente-suporte';
import { agenteRH } from './agentes-de-ia/agente-rh';
import { agenteIntegracao } from './agentes-de-ia/agente-integracao';
import { agenteConcorrencia } from './agentes-de-ia/agente-concorrencia';

export const allProducts: Product[] = [
  // Micro-Empresas (8 produtos)
  dashboardsPersonalizados,
  gestaoCobrancas,
  landingPages,
  postsSociais,
  lojaVirtual,
  crmSimples,
  relatoriosFinanceiros,
  fidelidadeDigital,
  
  // IA Automatizada (8 produtos)
  webScraping,
  gestaoAnuncios,
  analisePreditiva,
  iaAtendimento,
  automacaoEmails,
  precificacaoDinamica,
  insightsMercado,
  criacaoConteudo,
  
  // Agentes de IA (8 produtos)
  botsAutomacao,
  assistenteVendas,
  agenteFinanceiro,
  agenteMarketing,
  agenteSuporte,
  agenteRH,
  agenteIntegracao,
  agenteConcorrencia
];

export function getProducts(categorySlug?: string): Product[] {
  if (categorySlug) {
    return allProducts.filter(product => product.category === categorySlug);
  }
  return allProducts;
}

export function getProduct(slug: string): Product | null {
  return allProducts.find(product => product.slug === slug) || null;
}

// Função para formatar preço
export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(priceInCents / 100);
}
