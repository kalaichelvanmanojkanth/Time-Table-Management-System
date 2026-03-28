const express = require('express');
const { body, param } = require('express-validator');
const TimeSlot = require('../models/TimeSlot');
const { protect } = require('../middleware/auth');
const {
  asyncHandler,
  handleValidationErrors,
  sendNotFound,
} = require('./routeHelpers');
const { DAY_VALUES, TIME_PATTERN } = require('./timetableHelpers');

const router = express.Router();

router.use(protect);

const toMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const timeSlotValidation = [
  body('day').isIn(DAY_VALUES).withMessage('Day is invalid'),
  body('startTime')
    .matches(TIME_PATTERN)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .matches(TIME_PATTERN)
    .withMessage('End time must be in HH:MM format')
    .custom((value, { req }) => {
      if (!TIME_PATTERN.test(req.body.startTime || '')) {
        return true;
      }

      return toMinutes(value) > toMinutes(req.body.startTime);
    })
    .withMessage('End time must be after start time'),
];

const idValidation = [param('id', 'Invalid resource id').isMongoId()];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const timeSlots = await TimeSlot.find().sort({
      day: 1,
      startTime: 1,
      endTime: 1,
    });

    res.json({
      success: true,
      count: timeSlots.length,
      data: timeSlots,
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

    const timeSlot = await TimeSlot.findById(req.params.id);

    if (!timeSlot) {
      sendNotFound(res, 'Time slot');
      return;
    }

    res.json({
      success: true,
      data: timeSlot,
    });
  })
);

router.post(
  '/',
  timeSlotValidation,
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const timeSlot = await TimeSlot.create(req.body);

    res.status(201).json({
      success: true,
      data: timeSlot,
      message: 'Time slot created successfully',
    });
  })
);

router.put(
  '/:id',
  [...idValidation, ...timeSlotValidation],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const timeSlot = await TimeSlot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!timeSlot) {
      sendNotFound(res, 'Time slot');
      return;
    }

    res.json({
      success: true,
      data: timeSlot,
      message: 'Time slot updated successfully',
    });
  })
);

router.delete(
  '/:id',
  idValidation,
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const timeSlot = await TimeSlot.findByIdAndDelete(req.params.id);

    if (!timeSlot) {
      sendNotFound(res, 'Time slot');
      return;
    }

    res.json({
      success: true,
      message: 'Time slot deleted successfully',
    });
  })
);

module.exports = router;
