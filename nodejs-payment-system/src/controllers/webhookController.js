import { MercadoPagoService } from '../services/mercadoPagoService.js';
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { LogService } from '../services/logService.js';
import { successResponse, errorResponse } from '../utils/response.js';

export class WebhookController {
  /**
   * POST /webhook/mercadopago
   * Recebe notificações do Mercado Pago
   */
  static async mercadoPagoWebhook(req, res) {
    try {
      const { type, data } = req.body;

      // Log da notificação recebida
      await LogService.create({
        event_type: 'webhook_received',
        source: 'mercadopago',
        data: req.body,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });

      // Responde imediatamente ao Mercado Pago
      res.status(200).send('OK');

      // Processa apenas notificações de pagamento
      if (type !== 'payment') {
        console.log('⚠️ Tipo de notificação ignorado:', type);
        return;
      }

      const paymentId = data.id;
      console.log('💳 Processando pagamento:', paymentId);

      // Consulta informações do pagamento na API do Mercado Pago
      const paymentInfo = await MercadoPagoService.getPaymentInfo(paymentId);
      
      // Log detalhado do pagamento
      await LogService.create({
        event_type: 'payment_info_retrieved',
        source: 'mercadopago',
        data: paymentInfo,
      });

      // Extrai informações relevantes
      const extractedInfo = MercadoPagoService.extractPaymentInfo(paymentInfo);

      // Busca ou cria registro de pagamento
      let payment = await Payment.findByMercadoPagoId(paymentId.toString());
      
      if (!payment) {
        // Se não existe, busca pela external_reference (order_id)
        const orderId = paymentInfo.external_reference;
        if (orderId) {
          const order = await Order.findById(orderId);
          if (order) {
            payment = await Payment.create({
              order_id: orderId,
              mercadopago_payment_id: paymentId.toString(),
              payment_type: 'automatic',
              payment_method: extractedInfo.payment_method,
              status: extractedInfo.status,
              amount: extractedInfo.transaction_amount,
              payer_email: extractedInfo.payer_email,
              payer_name: extractedInfo.payer_name,
              metadata: extractedInfo,
            });
          }
        }
      }

      if (!payment) {
        console.log('⚠️ Pagamento não encontrado no sistema:', paymentId);
        await LogService.create({
          event_type: 'payment_not_found',
          source: 'mercadopago',
          data: { payment_id: paymentId, external_reference: paymentInfo.external_reference },
        });
        return;
      }

      // Atualiza status do pagamento
      const isApproved = MercadoPagoService.isPaymentApproved(paymentInfo);
      const newStatus = extractedInfo.status;
      const approvedAt = isApproved ? new Date(extractedInfo.date_approved) : null;

      await Payment.updateStatus(payment.id, newStatus, approvedAt);

      // Atualiza status do pedido
      if (payment.order_id) {
        let orderStatus = 'pending';
        if (isApproved) {
          orderStatus = 'approved';
        } else if (newStatus === 'rejected' || newStatus === 'cancelled') {
          orderStatus = newStatus;
        }

        await Order.updateStatus(payment.order_id, orderStatus);

        // Log de liberação de produto
        if (isApproved) {
          await LogService.create({
            event_type: 'payment_approved',
            source: 'mercadopago',
            order_id: payment.order_id,
            payment_id: payment.id,
            data: {
              message: 'Pagamento aprovado - Produto liberado automaticamente',
              payment_info: extractedInfo,
            },
          });

          console.log('✅ Pagamento aprovado! Pedido:', payment.order_id);
        }
      }

      // Log final
      await LogService.create({
        event_type: 'webhook_processed',
        source: 'mercadopago',
        order_id: payment.order_id,
        payment_id: payment.id,
        data: {
          status: newStatus,
          approved: isApproved,
          payment_info: extractedInfo,
        },
      });

    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      
      await LogService.create({
        event_type: 'webhook_error',
        source: 'mercadopago',
        data: {
          error: error.message,
          stack: error.stack,
          body: req.body,
        },
      });
    }
  }
}
