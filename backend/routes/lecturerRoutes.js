const express = require('express');
const { body, param } = require('express-validator');
const Lecturer = require('../models/Lecturer');
const { protect } = require('../middleware/auth');
const {
  DEPARTMENT_PATTERN,
  PERSON_NAME_PATTERN,
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

const lecturerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Lecturer name is required')
    .matches(PERSON_NAME_PATTERN)
    .withMessage(
      'Lecturer name can only contain letters, spaces, apostrophes, periods, and hyphens'
    )
    .isLength({ max: 120 })
    .withMessage('Lecturer name cannot exceed 120 characters'),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required')
    .matches(DEPARTMENT_PATTERN)
    .withMessage(
      'Department can only contain letters, spaces, ampersands, slashes, and hyphens'
    )
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  body('availability')
    .isArray({ min: 1 })
    .withMessage('At least one availability window is required')
    .custom((availability) => {
      const windowsByDay = new Map();

      availability.forEach((item, index) => {
        if (!DAY_VALUES.includes(item?.day)) {
          throw new Error(`Availability window ${index + 1} has an invalid day`);
        }

        if (!TIME_PATTERN.test(item?.startTime || '')) {
          throw new Error(
            `Availability window ${index + 1} start time must be in HH:MM format`
          );
        }

        if (!TIME_PATTERN.test(item?.endTime || '')) {
          throw new Error(
            `Availability window ${index + 1} end time must be in HH:MM format`
          );
        }

        if (toMinutes(item.endTime) <= toMinutes(item.startTime)) {
          throw new Error(
            `Availability window ${index + 1} must end after it starts`
          );
        }

        if (!windowsByDay.has(item.day)) {
          windowsByDay.set(item.day, []);
        }

        windowsByDay.get(item.day).push(item);
      });

      for (const [day, windows] of windowsByDay.entries()) {
        const sortedWindows = [...windows].sort(
          (left, right) => toMinutes(left.startTime) - toMinutes(right.startTime)
        );

        for (let index = 1; index < sortedWindows.length; index += 1) {
          const previousWindow = sortedWindows[index - 1];
          const currentWindow = sortedWindows[index];

          if (toMinutes(previousWindow.endTime) > toMinutes(currentWindow.startTime)) {
            throw new Error(`Availability windows cannot overlap on ${day}`);
          }
        }
      }

      return true;
    }),
];

const idValidation = [param('id', 'Invalid resource id').isMongoId()];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const lecturers = await Lecturer.find().sort({ department: 1, name: 1 });

    res.json({
      success: true,
      count: lecturers.length,
      data: lecturers,
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

    const lecturer = await Lecturer.findById(req.params.id);

    if (!lecturer) {
      sendNotFound(res, 'Lecturer');
      return;
    }

    res.json({
      success: true,
      data: lecturer,
    });
  })
);

router.post(
  '/',
  lecturerValidation,
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const lecturer = await Lecturer.create(req.body);

    res.status(201).json({
      success: true,
      data: lecturer,
      message: 'Lecturer created successfully',
    });
  })
);

router.put(
  '/:id',
  [...idValidation, ...lecturerValidation],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const lecturer = await Lecturer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!lecturer) {
      sendNotFound(res, 'Lecturer');
      return;
    }

    res.json({
      success: true,
      data: lecturer,
      message: 'Lecturer updated successfully',
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

    const lecturer = await Lecturer.findByIdAndDelete(req.params.id);

    if (!lecturer) {
      sendNotFound(res, 'Lecturer');
      return;
    }

    res.json({
      success: true,
      message: 'Lecturer deleted successfully',
    });
  })
);

module.exports = router;
