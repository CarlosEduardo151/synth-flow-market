// Micro-Empresas
export { dashboardsPersonalizados } from './micro-empresas/dashboards-personalizados';
export { gestaoCobrancas } from './micro-empresas/gestao-cobrancas';
export { crmSimples } from './micro-empresas/crm-simples';
export { relatoriosFinanceiros } from './micro-empresas/relatorios-financeiros';
export { fidelidadeDigital } from './micro-empresas/fidelidade-digital';
export { automacaoNotasFiscais } from './micro-empresas/automacao-notas-fiscais';

// IA Automatizada
// (removidos do catálogo)

// Agentes de IA
export { botsAutomacao } from './agentes-de-ia/bots-automacao';
export { assistenteVendas } from './agentes-de-ia/assistente-vendas';
export { agenteFinanceiro } from './agentes-de-ia/agente-financeiro';
export { microBusinessSuite } from './agentes-de-ia/micro-business-suite';
// export { agenteSuporte } from './agentes-de-ia/agente-suporte'; // DESATIVADO TEMPORARIAMENTE
// export { agenteRH } from './agentes-de-ia/agente-rh'; // DESATIVADO TEMPORARIAMENTE

// Soluções Automotivas
export { gestaoFrotasOficinas } from './solucoes-automotivas/gestao-frotas-oficinas';

// NFC
// (removidos do catálogo)

import { Product } from '@/types/product';
import { dashboardsPersonalizados } from './micro-empresas/dashboards-personalizados';
import { gestaoCobrancas } from './micro-empresas/gestao-cobrancas';
import { crmSimples } from './micro-empresas/crm-simples';
import { relatoriosFinanceiros } from './micro-empresas/relatorios-financeiros';
import { fidelidadeDigital } from './micro-empresas/fidelidade-digital';
import { automacaoNotasFiscais } from './micro-empresas/automacao-notas-fiscais';

// IA Automatizada (removidos do catálogo)

import { botsAutomacao } from './agentes-de-ia/bots-automacao';
import { assistenteVendas } from './agentes-de-ia/assistente-vendas';
import { agenteFinanceiro } from './agentes-de-ia/agente-financeiro';
import { microBusinessSuite } from './agentes-de-ia/micro-business-suite';
// import { agenteSuporte } from './agentes-de-ia/agente-suporte'; // DESATIVADO TEMPORARIAMENTE
// import { agenteRH } from './agentes-de-ia/agente-rh'; // DESATIVADO TEMPORARIAMENTE

import { gestaoFrotasOficinas } from './solucoes-automotivas/gestao-frotas-oficinas';

// NFC (removidos do catálogo)

export const allProducts: Product[] = [
  // Micro-Empresas (6 produtos)
  dashboardsPersonalizados,
  gestaoCobrancas,
  crmSimples,
  relatoriosFinanceiros,
  fidelidadeDigital,
  automacaoNotasFiscais,
  
  // IA Automatizada (removidos do catálogo)
  
  // Agentes de IA (4 produtos - agenteSuporte e agenteRH desativados)
  botsAutomacao,
  assistenteVendas,
  agenteFinanceiro,
  microBusinessSuite,
  // agenteSuporte, // DESATIVADO TEMPORARIAMENTE
  // agenteRH, // DESATIVADO TEMPORARIAMENTE

  // Soluções Automotivas
  gestaoFrotasOficinas,
  
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
