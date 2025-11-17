import mercadopago from 'mercadopago';
import { config } from '../../config/config.js';

// Configure Mercado Pago SDK
mercadopago.configure({
  access_token: config.mercadoPago.accessToken,
});

export class MercadoPagoService {
  /**
   * Cria uma preferência de pagamento no Mercado Pago
   */
  static async createPreference(orderData) {
    try {
      const preference = {
        items: orderData.items.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || '',
          quantity: item.quantity || 1,
          currency_id: 'BRL',
          unit_price: parseFloat(item.price),
        })),
        payer: {
          name: orderData.customer_name,
          email: orderData.customer_email,
          phone: orderData.customer_phone ? {
            number: orderData.customer_phone
          } : undefined,
        },
        back_urls: {
          success: orderData.success_url || `${config.webhook.url}/success`,
          failure: orderData.failure_url || `${config.webhook.url}/failure`,
          pending: orderData.pending_url || `${config.webhook.url}/pending`,
        },
        auto_return: 'approved',
        notification_url: config.webhook.url,
        external_reference: orderData.order_id,
        statement_descriptor: 'LOJA DIGITAL',
        payment_methods: {
          installments: 12,
          default_installments: 1,
        },
      };

      const response = await mercadopago.preferences.create(preference);
      
      return {
        id: response.body.id,
        init_point: response.body.init_point, // Link de pagamento
        sandbox_init_point: response.body.sandbox_init_point,
        preference_id: response.body.id,
      };
    } catch (error) {
      console.error('Erro ao criar preferência Mercado Pago:', error);
      throw new Error('Falha ao criar preferência de pagamento: ' + error.message);
    }
  }

  /**
   * Consulta informações de um pagamento
   */
  static async getPaymentInfo(paymentId) {
    try {
      const response = await mercadopago.payment.findById(paymentId);
      return response.body;
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error);
      throw new Error('Falha ao buscar informações do pagamento');
    }
  }

  /**
   * Verifica se o pagamento foi aprovado
   */
  static isPaymentApproved(paymentData) {
    return paymentData.status === 'approved';
  }

  /**
   * Extrai informações relevantes do pagamento
   */
  static extractPaymentInfo(paymentData) {
    return {
      payment_id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      payment_type: paymentData.payment_type_id,
      payment_method: paymentData.payment_method_id,
      transaction_amount: paymentData.transaction_amount,
      net_amount: paymentData.transaction_details?.net_received_amount,
      installments: paymentData.installments,
      payer_email: paymentData.payer?.email,
      payer_name: paymentData.payer?.first_name + ' ' + paymentData.payer?.last_name,
      external_reference: paymentData.external_reference,
      date_approved: paymentData.date_approved,
    };
  }
}
