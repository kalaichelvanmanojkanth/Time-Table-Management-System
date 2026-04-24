const express = require('express');
const router  = express.Router();
const { getSchedules, saveSchedule, generateScheduleEntries, getScheduleById, deleteSchedule } = require('../controllers/scheduleController');

// POST /api/schedule/generate — generate entries from setup data (no DB write)
router.post('/generate', generateScheduleEntries);

// GET  /api/schedule      — fetch all schedules
router.get('/',      getSchedules);

// POST /api/schedule      — save a new schedule (auto-generates entries if empty)
router.post('/',     saveSchedule);

// GET  /api/schedule/:id  — get one schedule
router.get('/:id',   getScheduleById);

// DELETE /api/schedule/:id
router.delete('/:id', deleteSchedule);

module.exports = router;
