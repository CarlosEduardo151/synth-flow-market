import { PaymentService } from '../services/paymentService.js';
import { Payment } from '../models/Payment.js';
import { successResponse, errorResponse } from '../utils/response.js';

export class PaymentController {
  /**
   * POST /create-payment
   * Cria um novo pagamento (automático ou semi-automático)
   */
  static async createPayment(req, res) {
    try {
      const { payment_type, ...paymentData } = req.body;

      let result;

      if (payment_type === 'automatic' || payment_type === 'mercadopago') {
        result = await PaymentService.createAutomaticPayment(paymentData, req);
      } else if (payment_type === 'semi-auto' || payment_type === 'pix') {
        result = await PaymentService.createSemiAutoPayment(paymentData, req);
      } else {
        return errorResponse(res, 'Tipo de pagamento inválido', 400);
      }

      return successResponse(res, result, 'Pagamento criado com sucesso', 201);
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * POST /semi-auto/pay
   * Pagamento semi-automático (PIX)
   */
  static async semiAutoPay(req, res) {
    try {
      const paymentData = {
        ...req.body,
        payment_type: 'semi-auto'
      };

      const result = await PaymentService.createSemiAutoPayment(paymentData, req);
      return successResponse(res, result, 'Pagamento PIX criado com sucesso', 201);
    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * GET /payments/all
   * Lista todos os pagamentos
   */
  static async getAllPayments(req, res) {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const payments = await Payment.findAll(parseInt(limit), parseInt(offset));
      
      return successResponse(res, {
        payments,
        total: payments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * GET /payments/:id
   * Busca um pagamento específico
   */
  static async getPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await Payment.findById(id);
      
      if (!payment) {
        return errorResponse(res, 'Pagamento não encontrado', 404);
      }

      return successResponse(res, payment);
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}
