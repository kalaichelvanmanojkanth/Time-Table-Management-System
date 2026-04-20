const express = require('express');
const router  = express.Router();
const {
  getLecturers, createLecturer, updateLecturer, deleteLecturer,
} = require('../controllers/lecturerController');

router.route('/').get(getLecturers).post(createLecturer);
router.route('/:id').put(updateLecturer).delete(deleteLecturer);

module.exports = router;
