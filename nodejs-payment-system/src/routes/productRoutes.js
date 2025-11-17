import express from 'express';
import { ProductController } from '../controllers/productController.js';

const router = express.Router();

// POST /products/add - Adiciona novo produto
router.post('/products/add', ProductController.addProduct);

// GET /products - Lista todos produtos
router.get('/products', ProductController.getProducts);

// GET /products/:id - Busca produto específico
router.get('/products/:id', ProductController.getProduct);

// PUT /products/:id - Atualiza produto
router.put('/products/:id', ProductController.updateProduct);

// DELETE /products/:id - Deleta produto
router.delete('/products/:id', ProductController.deleteProduct);

export default router;
