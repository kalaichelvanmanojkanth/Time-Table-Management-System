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

const router = express.Router();
const protectedWrite = [protect];

const roomValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Room name is required')
    .matches(ROOM_NAME_PATTERN)
    .withMessage(
      'Room name can only contain letters, numbers, spaces, periods, slashes, and hyphens'
    )
    .isLength({ max: 80 })
    .withMessage('Room name cannot exceed 80 characters'),
  body('capacity')
    .toInt()
    .isInt({ min: 1 })
    .withMessage('Room capacity must be a positive integer'),
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Room type is required')
    .matches(ROOM_TYPE_PATTERN)
    .withMessage(
      'Room type can only contain letters, spaces, ampersands, slashes, and hyphens'
    )
    .isLength({ max: 80 })
    .withMessage('Room type cannot exceed 80 characters'),
];

const idValidation = [param('id', 'Invalid resource id').isMongoId()];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rooms = await Room.find().sort({ name: 1 });

    res.json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  })
);

router.get(
  '/:id',
  idValidation,
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const room = await Room.findById(req.params.id);

    if (!room) {
      sendNotFound(res, 'Room');
      return;
    }

    res.json({
      success: true,
      data: room,
    });
  })
);

router.post(
  '/',
  protectedWrite,
  roomValidation,
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const room = await Room.create(req.body);

    res.status(201).json({
      success: true,
      data: room,
      message: 'Room created successfully',
    });
  })
);

router.put(
  '/:id',
  [...protectedWrite, ...idValidation, ...roomValidation],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!room) {
      sendNotFound(res, 'Room');
      return;
    }

    res.json({
      success: true,
      data: room,
      message: 'Room updated successfully',
    });
  })
);

router.delete(
  '/:id',
  [...protectedWrite, ...idValidation],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      sendNotFound(res, 'Room');
      return;
    }

    res.json({
      success: true,
      message: 'Room deleted successfully',
    });
  })
);

module.exports = router;
