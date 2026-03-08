const express = require('express');
const { body } = require('express-validator');
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

// @route   POST /api/auth/register
router.post(
  '/register',
  [
    body('name', 'Name is required').notEmpty().trim(),
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password must be at least 6 characters').isLength({
      min: 6,
    }),
  ],
  registerUser
);

// @route   POST /api/auth/login
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password is required').notEmpty(),
  ],
  loginUser
);

module.exports = router;
