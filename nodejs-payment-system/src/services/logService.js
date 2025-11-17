import { query } from '../../database/connection.js';

export class LogService {
  static async create(logData) {
    try {
      const {
        event_type,
        source,
        order_id,
        payment_id,
        data,
        ip_address,
        user_agent
      } = logData;

      const sql = `
        INSERT INTO logs (event_type, source, order_id, payment_id, data, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        event_type,
        source || 'system',
        order_id || null,
        payment_id || null,
        JSON.stringify(data),
        ip_address || null,
        user_agent || null
      ];

      const result = await query(sql, values);
      
      // Console log em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 LOG:', {
          event_type,
          source,
          timestamp: new Date().toISOString(),
          data: JSON.stringify(data, null, 2)
        });
      }

      return result.rows[0];
    } catch (error) {
      console.error('❌ Erro ao criar log:', error);
      // Não lança erro para não quebrar o fluxo principal
    }
  }

  static async findAll(limit = 100, offset = 0) {
    const sql = `
      SELECT * FROM logs 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await query(sql, [limit, offset]);
    return result.rows;
  }

  static async findByEventType(eventType, limit = 100) {
    const sql = `
      SELECT * FROM logs 
      WHERE event_type = $1
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await query(sql, [eventType, limit]);
    return result.rows;
  }

  static async findByOrderId(orderId) {
    const sql = `
      SELECT * FROM logs 
      WHERE order_id = $1
      ORDER BY created_at ASC
    `;
    const result = await query(sql, [orderId]);
    return result.rows;
  }
}
