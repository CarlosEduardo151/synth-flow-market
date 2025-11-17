import { query } from '../../database/connection.js';

export class Order {
  static async create(orderData) {
    const {
      customer_name,
      customer_email,
      customer_phone,
      total_amount,
      discount_amount,
      subtotal_amount,
      payment_method,
      status
    } = orderData;

    const sql = `
      INSERT INTO orders (
        customer_name, customer_email, customer_phone, 
        total_amount, discount_amount, subtotal_amount, 
        payment_method, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      customer_name,
      customer_email,
      customer_phone || null,
      total_amount,
      discount_amount || 0,
      subtotal_amount,
      payment_method,
      status || 'pending'
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async findById(id) {
    const sql = 'SELECT * FROM orders WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async findAll(limit = 100, offset = 0) {
    const sql = `
      SELECT * FROM orders 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await query(sql, [limit, offset]);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const sql = `
      UPDATE orders 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [status, id]);
    return result.rows[0];
  }

  static async addItem(orderId, itemData) {
    const { product_id, product_title, product_slug, product_price, quantity } = itemData;
    
    const sql = `
      INSERT INTO order_items (order_id, product_id, product_title, product_slug, product_price, quantity)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [orderId, product_id, product_title, product_slug, product_price, quantity || 1];
    const result = await query(sql, values);
    return result.rows[0];
  }

  static async getItems(orderId) {
    const sql = 'SELECT * FROM order_items WHERE order_id = $1';
    const result = await query(sql, [orderId]);
    return result.rows;
  }
}
