import { supabase } from '@/integrations/supabase/client';

export interface PaymentItem {
  product_id: string;
  quantity: number;
}

export interface CreatePaymentData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_cpf?: string;
  items: PaymentItem[];
  discount_amount?: number;
  payment_type: 'automatic' | 'semi-auto' | 'pix' | 'efi';
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
    total_amount: number;
    provider?: 'efi';
    environment?: string;
    pix?: {
      txid: string;
      copia_e_cola: string;
      qrcode_image: string | null;
      qrcode_text: string;
      expiration_seconds: number;
    };
  };
  message?: string;
}

class PaymentService {
  /**
   * Cria um pagamento PIX via Efí Bank (homologação)
   */
  async createAutomaticPayment(data: CreatePaymentData): Promise<PaymentResponse> {
    return this.createEfiPixPayment(data);
  }

  async createSemiAutoPayment(data: CreatePaymentData): Promise<PaymentResponse> {
    return this.createEfiPixPayment(data);
  }

  async createEfiPixPayment(data: CreatePaymentData): Promise<PaymentResponse> {
    try {
      const { data: result, error } = await supabase.functions.invoke('efi-create-payment', {
        body: data,
      });
      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Erro ao criar pagamento Efí:', error);
      throw error;
    }
  }

  /**
   * Verifica status de uma cobrança PIX na Efí
   */
  async checkEfiPayment(txid: string, payment_id?: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('efi-check-payment', {
      body: { txid, payment_id },
    });
    if (error) throw error;
    return data;
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
