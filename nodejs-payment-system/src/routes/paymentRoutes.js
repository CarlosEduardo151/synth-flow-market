import express from 'express';
import { PaymentController } from '../controllers/paymentController.js';

const router = express.Router();

// POST /create-payment - Cria pagamento (automático ou semi-automático)
router.post('/create-payment', PaymentController.createPayment);

// POST /semi-auto/pay - Pagamento semi-automático (PIX)
router.post('/semi-auto/pay', PaymentController.semiAutoPay);

// GET /payments/all - Lista todos pagamentos
router.get('/payments/all', PaymentController.getAllPayments);

// GET /payments/:id - Busca pagamento específico
router.get('/payments/:id', PaymentController.getPayment);

export default router;
