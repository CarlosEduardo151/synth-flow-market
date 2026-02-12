// Micro-Empresas
export { dashboardsPersonalizados } from './micro-empresas/dashboards-personalizados';
export { gestaoCobrancas } from './micro-empresas/gestao-cobrancas';
export { crmSimples } from './micro-empresas/crm-simples';
export { relatoriosFinanceiros } from './micro-empresas/relatorios-financeiros';
export { fidelidadeDigital } from './micro-empresas/fidelidade-digital';

// IA Automatizada
// (removidos do catálogo)

// Agentes de IA
export { botsAutomacao } from './agentes-de-ia/bots-automacao';
export { assistenteVendas } from './agentes-de-ia/assistente-vendas';
export { agenteFinanceiro } from './agentes-de-ia/agente-financeiro';
// export { agenteSuporte } from './agentes-de-ia/agente-suporte'; // DESATIVADO TEMPORARIAMENTE
// export { agenteRH } from './agentes-de-ia/agente-rh'; // DESATIVADO TEMPORARIAMENTE

// NFC
// (removidos do catálogo)

import { Product } from '@/types/product';
import { dashboardsPersonalizados } from './micro-empresas/dashboards-personalizados';
import { gestaoCobrancas } from './micro-empresas/gestao-cobrancas';
import { crmSimples } from './micro-empresas/crm-simples';
import { relatoriosFinanceiros } from './micro-empresas/relatorios-financeiros';
import { fidelidadeDigital } from './micro-empresas/fidelidade-digital';

// IA Automatizada (removidos do catálogo)

import { botsAutomacao } from './agentes-de-ia/bots-automacao';
import { assistenteVendas } from './agentes-de-ia/assistente-vendas';
import { agenteFinanceiro } from './agentes-de-ia/agente-financeiro';
// import { agenteSuporte } from './agentes-de-ia/agente-suporte'; // DESATIVADO TEMPORARIAMENTE
// import { agenteRH } from './agentes-de-ia/agente-rh'; // DESATIVADO TEMPORARIAMENTE

// NFC (removidos do catálogo)

export const allProducts: Product[] = [
  // Micro-Empresas (5 produtos)
  dashboardsPersonalizados,
  gestaoCobrancas,
  crmSimples,
  relatoriosFinanceiros,
  fidelidadeDigital,
  
  // IA Automatizada (removidos do catálogo)
  
  // Agentes de IA (3 produtos - agenteSuporte e agenteRH desativados)
  botsAutomacao,
  assistenteVendas,
  agenteFinanceiro,
  // agenteSuporte, // DESATIVADO TEMPORARIAMENTE
  // agenteRH, // DESATIVADO TEMPORARIAMENTE
  
  // NFC (removidos do catálogo)
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
