const express = require('express');
const { body, param } = require('express-validator');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');
const {
  ROOM_NAME_PATTERN,
  ROOM_TYPE_PATTERN,
  asyncHandler,
  handleValidationErrors,
  sendNotFound,
} = require('./routeHelpers');
const {
  getRooms, createRoom, updateRoom, deleteRoom,
} = require('../controllers/roomController');

const router = express.Router();
const protectedWrite = [protect];

const roomValidation = [
  body('name').trim().notEmpty().withMessage('Room name is required')
    .matches(ROOM_NAME_PATTERN).withMessage('Room name can only contain letters, numbers, spaces, periods, slashes, and hyphens')
    .isLength({ max: 80 }).withMessage('Room name cannot exceed 80 characters'),
  body('capacity').toInt().isInt({ min: 1 }).withMessage('Room capacity must be a positive integer'),
  body('type').trim().notEmpty().withMessage('Room type is required')
    .matches(ROOM_TYPE_PATTERN).withMessage('Room type can only contain letters, spaces, ampersands, slashes, and hyphens')
    .isLength({ max: 80 }).withMessage('Room type cannot exceed 80 characters'),
];

const idValidation = [param('id', 'Invalid resource id').isMongoId()];

// Analytics Branch Controllers
router.get('/', getRooms);
router.post('/', protectedWrite, roomValidation, handleValidationErrors, createRoom);
router.put('/:id', [...protectedWrite, ...idValidation, ...roomValidation], handleValidationErrors, updateRoom);
router.delete('/:id', [...protectedWrite, ...idValidation], handleValidationErrors, deleteRoom);

module.exports = router;
