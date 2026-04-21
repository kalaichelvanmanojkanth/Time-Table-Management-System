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
const {
  getLecturers, createLecturer, updateLecturer, deleteLecturer,
} = require('../controllers/lecturerController');

const router = express.Router();
const protectedWrite = [protect];

const toMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const lecturerValidation = [
  body('name').trim().notEmpty().withMessage('Lecturer name is required')
    .matches(PERSON_NAME_PATTERN).withMessage('Lecturer name can only contain letters, spaces, apostrophes, periods, and hyphens')
    .isLength({ max: 120 }).withMessage('Lecturer name cannot exceed 120 characters'),
  body('department').trim().notEmpty().withMessage('Department is required')
    .matches(DEPARTMENT_PATTERN).withMessage('Department can only contain letters, spaces, ampersands, slashes, and hyphens')
    .isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters'),
];

const idValidation = [param('id', 'Invalid resource id').isMongoId()];

// Analytics Branch Controllers (These handle the new Subjects/WeeklyHours logic)
router.get('/', getLecturers);
router.post('/', protectedWrite, lecturerValidation, handleValidationErrors, createLecturer);
router.put('/:id', [...protectedWrite, ...idValidation, ...lecturerValidation], handleValidationErrors, updateLecturer);
router.delete('/:id', [...protectedWrite, ...idValidation], handleValidationErrors, deleteLecturer);

module.exports = router;
