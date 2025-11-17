import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config/config.js';
import { pool } from './database/connection.js';

// Routes
import paymentRoutes from './src/routes/paymentRoutes.js';
import webhookRoutes from './src/routes/webhookRoutes.js';
import productRoutes from './src/routes/productRoutes.js';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`, {
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    ip: req.ip,
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/', paymentRoutes);
app.use('/', webhookRoutes);
app.use('/', productRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.path,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(config.app.env === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = config.app.port;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  🚀 Payment System Server Running                        ║
║                                                           ║
║  📍 Port: ${PORT}                                           ║
║  🌍 Environment: ${config.app.env}                        ║
║  💳 Mercado Pago: ${config.mercadoPago.accessToken ? '✅ Configured' : '❌ Not configured'}      ║
║  🗄️  Database: ${config.database.name}                    ║
║                                                           ║
║  Available Routes:                                        ║
║  POST   /create-payment                                   ║
║  POST   /semi-auto/pay                                    ║
║  POST   /webhook/mercadopago                              ║
║  GET    /payments/all                                     ║
║  GET    /products                                         ║
║  POST   /products/add                                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Test database connection
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('⚠️  Server running but database is not available\n');
  }
});

export default app;
