import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Product } from '../models/Product.js';
import { MercadoPagoService } from './mercadoPagoService.js';
import { LogService } from './logService.js';

export class PaymentService {
  /**
   * Cria um pagamento automático via Mercado Pago
   */
  static async createAutomaticPayment(paymentData, req) {
    try {
      // Valida produtos
      const items = await Promise.all(
        paymentData.items.map(async (item) => {
          const product = await Product.findById(item.product_id);
          if (!product) {
            throw new Error(`Produto ${item.product_id} não encontrado`);
          }
          if (!product.in_stock) {
            throw new Error(`Produto ${product.title} fora de estoque`);
          }
          return {
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            quantity: item.quantity || 1,
            slug: product.slug,
          };
        })
      );

      // Calcula totais
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discount = paymentData.discount_amount || 0;
      const total = subtotal - discount;

      // Cria pedido
      const order = await Order.create({
        customer_name: paymentData.customer_name,
        customer_email: paymentData.customer_email,
        customer_phone: paymentData.customer_phone,
        total_amount: total,
        discount_amount: discount,
        subtotal_amount: subtotal,
        payment_method: 'mercadopago',
        status: 'pending',
      });

      // Adiciona itens ao pedido
      for (const item of items) {
        await Order.addItem(order.id, {
          product_id: item.id,
          product_title: item.title,
          product_slug: item.slug,
          product_price: item.price,
          quantity: item.quantity,
        });
      }

      // Cria preferência no Mercado Pago
      const preference = await MercadoPagoService.createPreference({
        order_id: order.id,
        customer_name: paymentData.customer_name,
        customer_email: paymentData.customer_email,
        customer_phone: paymentData.customer_phone,
        items: items,
        success_url: paymentData.success_url,
        failure_url: paymentData.failure_url,
        pending_url: paymentData.pending_url,
      });

      // Registra pagamento
      const payment = await Payment.create({
        order_id: order.id,
        preference_id: preference.preference_id,
        payment_type: 'automatic',
        status: 'pending',
        amount: total,
        payer_email: paymentData.customer_email,
        payer_name: paymentData.customer_name,
      });

      // Log
      await LogService.create({
        event_type: 'payment_created',
        source: 'mercadopago',
        order_id: order.id,
        payment_id: payment.id,
        data: { preference, order, payment },
        ip_address: req?.ip,
        user_agent: req?.get('user-agent'),
      });

      return {
        order_id: order.id,
        payment_id: payment.id,
        preference_id: preference.preference_id,
        payment_link: preference.init_point,
        sandbox_link: preference.sandbox_init_point,
        total_amount: total,
      };
    } catch (error) {
      console.error('Erro ao criar pagamento automático:', error);
      throw error;
    }
  }

  /**
   * Cria um pagamento semi-automático (PIX)
   */
  static async createSemiAutoPayment(paymentData, req) {
    try {
      // Valida produtos
      const items = await Promise.all(
        paymentData.items.map(async (item) => {
          const product = await Product.findById(item.product_id);
          if (!product) {
            throw new Error(`Produto ${item.product_id} não encontrado`);
          }
          return {
            id: product.id,
            title: product.title,
            price: product.price,
            quantity: item.quantity || 1,
            slug: product.slug,
          };
        })
      );

      // Calcula totais
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discount = paymentData.discount_amount || 0;
      const total = subtotal - discount;

      // Cria pedido
      const order = await Order.create({
        customer_name: paymentData.customer_name,
        customer_email: paymentData.customer_email,
        customer_phone: paymentData.customer_phone,
        total_amount: total,
        discount_amount: discount,
        subtotal_amount: subtotal,
        payment_method: 'semi-auto',
        status: 'pending',
      });

      // Adiciona itens
      for (const item of items) {
        await Order.addItem(order.id, {
          product_id: item.id,
          product_title: item.title,
          product_slug: item.slug,
          product_price: item.price,
          quantity: item.quantity,
        });
      }

      // Registra pagamento
      const payment = await Payment.create({
        order_id: order.id,
        payment_type: 'semi-auto',
        payment_method: 'pix',
        status: 'pending',
        amount: total,
        payer_email: paymentData.customer_email,
        payer_name: paymentData.customer_name,
      });

      // Log
      await LogService.create({
        event_type: 'semi_auto_payment_created',
        source: 'semi-auto',
        order_id: order.id,
        payment_id: payment.id,
        data: { order, payment },
        ip_address: req?.ip,
        user_agent: req?.get('user-agent'),
      });

      return {
        order_id: order.id,
        payment_id: payment.id,
        total_amount: total,
        pix_info: {
          key: paymentData.pix_key || process.env.PIX_KEY,
          receiver_name: paymentData.pix_receiver || process.env.PIX_RECEIVER_NAME,
        },
      };
    } catch (error) {
      console.error('Erro ao criar pagamento semi-automático:', error);
      throw error;
    }
  }

  /**
   * Confirma pagamento semi-automático após upload de comprovante
   */
  static async confirmSemiAutoPayment(paymentId, proofUrl, req) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Pagamento não encontrado');
      }

      // Atualiza pagamento com comprovante
      await Payment.updateStatus(payment.id, 'pending_review', null);
      
      // Aqui você pode adicionar lógica de verificação manual ou automática

      await LogService.create({
        event_type: 'payment_proof_uploaded',
        source: 'semi-auto',
        payment_id: payment.id,
        order_id: payment.order_id,
        data: { proof_url: proofUrl },
        ip_address: req?.ip,
        user_agent: req?.get('user-agent'),
      });

      return payment;
    } catch (error) {
      console.error('Erro ao confirmar pagamento semi-automático:', error);
      throw error;
    }
  }
}
