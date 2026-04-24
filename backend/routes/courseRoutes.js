const express = require('express');
const { body, param } = require('express-validator');
const Course = require('../models/Course');
const { protect } = require('../middleware/auth');
const {
  COURSE_CODE_PATTERN,
  COURSE_NAME_PATTERN,
  DEPARTMENT_PATTERN,
  asyncHandler,
  handleValidationErrors,
  sendNotFound,
} = require('./routeHelpers');

const router = express.Router();
const protectedWrite = [protect];

const courseValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Course name is required')
    .matches(COURSE_NAME_PATTERN)
    .withMessage('Course name can contain only letters, spaces, apostrophes, and hyphens')
    .isLength({ max: 150 })
    .withMessage('Course name cannot exceed 150 characters'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Course code is required')
    .customSanitizer((value) => value.toUpperCase())
    .matches(COURSE_CODE_PATTERN)
    .withMessage('Course code can only contain letters, numbers, and hyphens')
    .isLength({ max: 30 })
    .withMessage('Course code cannot exceed 30 characters'),
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
  body('sessionsPerWeek')
    .toInt()
    .isInt({ min: 1 })
    .withMessage('Sessions per week must be a positive integer'),
];

const idValidation = [param('id', 'Invalid resource id').isMongoId()];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const courses = await Course.find().sort({ department: 1, code: 1 });

    res.json({
      success: true,
      count: courses.length,
      data: courses,
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

    const course = await Course.findById(req.params.id);

    if (!course) {
      sendNotFound(res, 'Course');
      return;
    }

    res.json({
      success: true,
      data: course,
    });
  })
);

router.post(
  '/',
  protectedWrite,
  courseValidation,
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const course = await Course.create(req.body);

    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully',
    });
  })
);

router.put(
  '/:id',
  [...protectedWrite, ...idValidation, ...courseValidation],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      sendNotFound(res, 'Course');
      return;
    }

    res.json({
      success: true,
      data: course,
      message: 'Course updated successfully',
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

    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      sendNotFound(res, 'Course');
      return;
    }

    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  })
);

module.exports = router;
