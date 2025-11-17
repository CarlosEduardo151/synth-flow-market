import express from 'express';
import { WebhookController } from '../controllers/webhookController.js';

const router = express.Router();

// POST /webhook/mercadopago - Recebe notificações do Mercado Pago
router.post('/webhook/mercadopago', WebhookController.mercadoPagoWebhook);

export default router;
