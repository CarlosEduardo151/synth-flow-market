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
}