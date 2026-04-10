const express = require('express');
const router  = express.Router();
const {
  getTimetables, createTimetable, updateTimetable, deleteTimetable,
} = require('../controllers/timetableController');

router.route('/').get(getTimetables).post(createTimetable);
router.route('/:id').put(updateTimetable).delete(deleteTimetable);

module.exports = router;
