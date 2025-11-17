import dotenv from 'dotenv';

dotenv.config();

export const config = {
  mercadoPago: {
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY,
  },
  webhook: {
    url: process.env.WEBHOOK_URL,
  },
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'payment_system',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  app: {
    port: process.env.APP_PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  pix: {
    key: process.env.PIX_KEY,
    receiverName: process.env.PIX_RECEIVER_NAME,
  }
};
