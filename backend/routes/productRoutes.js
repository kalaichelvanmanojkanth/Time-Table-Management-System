const express = require('express');
const { body } = require('express-validator');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules for creating/updating products
const productValidation = [
  body('name', 'Product name is required').notEmpty().trim(),
  body('description', 'Description is required').notEmpty().trim(),
  body('price', 'Price must be a positive number').isFloat({ min: 0 }),
  body('category', 'Category is required').notEmpty(),
  body('quantity', 'Quantity must be a non-negative number')
    .optional()
    .isInt({ min: 0 }),
];

// @route   GET /api/products
router.get('/', getProducts);

// @route   GET /api/products/:id
router.get('/:id', getProduct);

// @route   POST /api/products
router.post('/', protect, productValidation, createProduct);

// @route   PUT /api/products/:id
router.put('/:id', protect, updateProduct);

// @route   DELETE /api/products/:id
router.delete('/:id', protect, deleteProduct);

module.exports = router;
