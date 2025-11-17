import { body, validationResult } from 'express-validator';

/**
 * Middleware para validar resultado das validações
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Validações para criação de produto
 */
export const validateProduct = [
  body('title').notEmpty().withMessage('Título é obrigatório'),
  body('slug').notEmpty().withMessage('Slug é obrigatório'),
  body('price').isFloat({ min: 0 }).withMessage('Preço deve ser um número positivo'),
  validate,
];

/**
 * Validações para criação de pagamento
 */
export const validatePayment = [
  body('customer_name').notEmpty().withMessage('Nome do cliente é obrigatório'),
  body('customer_email').isEmail().withMessage('Email inválido'),
  body('items').isArray({ min: 1 }).withMessage('Deve conter pelo menos um item'),
  validate,
];
