import { Product } from '../models/Product.js';

export class ProductService {
  static async createProduct(productData) {
    try {
      // Valida dados obrigatórios
      if (!productData.title || !productData.slug || !productData.price) {
        throw new Error('Título, slug e preço são obrigatórios');
      }

      // Verifica se slug já existe
      const existingProduct = await Product.findBySlug(productData.slug);
      if (existingProduct) {
        throw new Error('Já existe um produto com este slug');
      }

      const product = await Product.create(productData);
      return product;
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  }

  static async getAllProducts() {
    try {
      const products = await Product.findAll();
      return products;
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }
  }

  static async getProductById(id) {
    try {
      const product = await Product.findById(id);
      if (!product) {
        throw new Error('Produto não encontrado');
      }
      return product;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      throw error;
    }
  }

  static async getProductBySlug(slug) {
    try {
      const product = await Product.findBySlug(slug);
      if (!product) {
        throw new Error('Produto não encontrado');
      }
      return product;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      throw error;
    }
  }

  static async updateProduct(id, productData) {
    try {
      const product = await Product.update(id, productData);
      if (!product) {
        throw new Error('Produto não encontrado');
      }
      return product;
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }

  static async deleteProduct(id) {
    try {
      const product = await Product.delete(id);
      if (!product) {
        throw new Error('Produto não encontrado');
      }
      return product;
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      throw error;
    }
  }
}
