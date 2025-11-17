import { query } from '../../database/connection.js';

export class Payment {
  static async create(paymentData) {
    const {
      order_id,
      mercadopago_payment_id,
      preference_id,
      payment_type,
      payment_method,
      status,
      amount,
      payer_email,
      payer_name,
      proof_url,
      metadata
    } = paymentData;

    const sql = `
      INSERT INTO payments (
        order_id, mercadopago_payment_id, preference_id, 
        payment_type, payment_method, status, amount,
        payer_email, payer_name, proof_url, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      order_id,
      mercadopago_payment_id || null,
      preference_id || null,
      payment_type,
      payment_method || null,
      status || 'pending',
      amount,
      payer_email || null,
      payer_name || null,
      proof_url || null,
      JSON.stringify(metadata || {})
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async findById(id) {
    const sql = 'SELECT * FROM payments WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async findByMercadoPagoId(mercadopagoId) {
    const sql = 'SELECT * FROM payments WHERE mercadopago_payment_id = $1';
    const result = await query(sql, [mercadopagoId]);
    return result.rows[0];
  }

  static async findByOrderId(orderId) {
    const sql = 'SELECT * FROM payments WHERE order_id = $1';
    const result = await query(sql, [orderId]);
    return result.rows;
  }

  static async updateStatus(id, status, approvedAt = null) {
    const sql = `
      UPDATE payments 
      SET status = $1, approved_at = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await query(sql, [status, approvedAt, id]);
    return result.rows[0];
  }

  static async findAll(limit = 100, offset = 0) {
    const sql = `
      SELECT p.*, o.customer_name, o.customer_email 
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      ORDER BY p.created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await query(sql, [limit, offset]);
    return result.rows;
  }
}
