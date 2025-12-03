import { supabase } from '@/integrations/supabase/client';

export interface PaymentItem {
  product_id: string;
  quantity: number;
}

export interface CreatePaymentData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: PaymentItem[];
  discount_amount?: number;
  payment_type: 'automatic' | 'semi-auto' | 'mercadopago' | 'pix';
  success_url?: string;
  failure_url?: string;
  pending_url?: string;
  pix_key?: string;
  pix_receiver?: string;
}

export interface PaymentResponse {
  success: boolean;
  data?: {
    order_id: string;
    payment_id: string;
    preference_id?: string;
    payment_link?: string;
    sandbox_link?: string;
    total_amount: number;
    pix_info?: {
      key: string;
      receiver_name: string;
    };
  };
  message?: string;
}

class PaymentService {
  /**
   * Cria um pagamento automático via Mercado Pago
   */
  async createAutomaticPayment(data: CreatePaymentData): Promise<PaymentResponse> {
    try {
      const { data: result, error } = await supabase.functions.invoke('mp-create-payment', {
        body: {
          ...data,
          payment_type: 'automatic',
        },
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Erro ao criar pagamento automático:', error);
      throw error;
    }
  }

  /**
   * Cria um pagamento semi-automático (PIX)
   */
  async createSemiAutoPayment(data: CreatePaymentData): Promise<PaymentResponse> {
    try {
      const { data: result, error } = await supabase.functions.invoke('mp-semi-auto-payment', {
        body: data,
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Erro ao criar pagamento semi-automático:', error);
      throw error;
    }
  }

  /**
   * Busca todos os pagamentos
   */
  async getAllPayments(): Promise<any> {
    try {
      const { data: result, error } = await supabase.functions.invoke('mp-payments/all', {
        method: 'GET',
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      throw error;
    }
  }

  /**
   * Busca um pagamento específico
   */
  async getPayment(id: string): Promise<any> {
    try {
      const { data: result, error } = await supabase.functions.invoke(`mp-payments/${id}`, {
        method: 'GET',
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error);
      throw error;
    }
  }

  /**
   * Sincroniza produtos
   */
  async syncProducts(products: any[]): Promise<void> {
    try {
      for (const product of products) {
        await supabase.functions.invoke('mp-products', {
          method: 'POST',
          body: {
            title: product.title,
            description: product.description || '',
            price: product.price,
            slug: product.slug,
            in_stock: true,
          },
        });
      }
    } catch (error) {
      console.error('Erro ao sincronizar produtos:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
