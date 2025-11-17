import { query } from '../../database/connection.js';

export class Product {
  static async create(productData) {
    const {
      title,
      slug,
      description,
      price,
      rental_price,
      category,
      images,
      features,
      in_stock,
      delivery
    } = productData;

    const sql = `
      INSERT INTO products (title, slug, description, price, rental_price, category, images, features, in_stock, delivery)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      title,
      slug,
      description,
      price,
      rental_price || null,
      category,
      JSON.stringify(images || []),
      JSON.stringify(features || []),
      in_stock !== undefined ? in_stock : true,
      delivery
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async findAll() {
    const sql = 'SELECT * FROM products ORDER BY created_at DESC';
    const result = await query(sql);
    return result.rows;
  }

  static async findById(id) {
    const sql = 'SELECT * FROM products WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async findBySlug(slug) {
    const sql = 'SELECT * FROM products WHERE slug = $1';
    const result = await query(sql, [slug]);
    return result.rows[0];
  }

  static async update(id, productData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(productData).forEach(key => {
      if (productData[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(
          key === 'images' || key === 'features' 
            ? JSON.stringify(productData[key]) 
            : productData[key]
        );
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const sql = `
      UPDATE products 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async delete(id) {
    const sql = 'DELETE FROM products WHERE id = $1 RETURNING *';
    const result = await query(sql, [id]);
    return result.rows[0];
  }
}
