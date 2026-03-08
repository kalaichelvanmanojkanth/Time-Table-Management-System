const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
router.get('/profile', protect, getUserProfile);

// @route   PUT /api/users/profile
router.put('/profile', protect, updateUserProfile);

module.exports = router;
