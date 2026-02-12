export interface OperationStep {
  step: string;
  action: string;
  detail: string;
}

export interface Product {
  title: string;
  slug: string;
  price: number;
  rentalPrice?: number; // Preço mensal de aluguel
  category: string;
  images: string[];
  short: string;
  badges: string[];
  features: string[];
  rentalAdvantages?: string[]; // Vantagens do aluguel
  requiredCredentials?: string[]; // Credenciais necessárias
  inStock: boolean;
  delivery: string;
  specs?: string;
  content?: string;
  systemPath?: string; // Path to the system/product dashboard
  operationManual?: OperationStep[]; // Manual de operação detalhado
}