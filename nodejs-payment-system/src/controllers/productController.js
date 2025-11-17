import { ProductService } from '../services/productService.js';
import { successResponse, errorResponse } from '../utils/response.js';

export class ProductController {
  /**
   * POST /products/add
   * Adiciona um novo produto
   */
  static async addProduct(req, res) {
    try {
      const productData = req.body;
      const product = await ProductService.createProduct(productData);
      
      return successResponse(res, product, 'Produto criado com sucesso', 201);
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      return errorResponse(res, error.message, 400);
    }
  }

  /**
   * GET /products
   * Lista todos os produtos
   */
  static async getProducts(req, res) {
    try {
      const products = await ProductService.getAllProducts();
      
      return successResponse(res, {
        products,
        total: products.length
      });
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * GET /products/:id
   * Busca um produto por ID
   */
  static async getProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await ProductService.getProductById(id);
      
      return successResponse(res, product);
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return errorResponse(res, error.message, 404);
    }
  }

  /**
   * PUT /products/:id
   * Atualiza um produto
   */
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const productData = req.body;
      const product = await ProductService.updateProduct(id, productData);
      
      return successResponse(res, product, 'Produto atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      return errorResponse(res, error.message, 400);
    }
  }

  /**
   * DELETE /products/:id
   * Deleta um produto
   */
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      await ProductService.deleteProduct(id);
      
      return successResponse(res, null, 'Produto deletado com sucesso');
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      return errorResponse(res, error.message, 400);
    }
  }
}
