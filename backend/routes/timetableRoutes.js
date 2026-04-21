const express = require('express');
const { body, param, query } = require('express-validator');
const Timetable = require('../models/Timetable');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('./routeHelpers');
const { validateWeekValue } = require('./timetableHelpers');
const {
  getTimetables, createTimetable, updateTimetable, deleteTimetable,
} = require('../controllers/timetableController');

const router = express.Router();
const protectedWrite = [protect];

const timetableValidation = [
  // Keeping validation flexible for both courseId (HEAD) and subjectId (Analytics)
  body('roomId', 'Room is required').optional().isMongoId(),
];

const idValidation = [param('id', 'Invalid timetable id').isMongoId()];

// Analytics Branch Controllers
router.get('/', getTimetables);
router.post('/', protectedWrite, timetableValidation, handleValidationErrors, createTimetable);
router.put('/:id', [...protectedWrite, ...idValidation, ...timetableValidation], handleValidationErrors, updateTimetable);
router.delete('/:id', [...protectedWrite, ...idValidation], handleValidationErrors, deleteTimetable);

module.exports = router;
