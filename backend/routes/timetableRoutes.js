const express = require('express');
const { body, param, query } = require('express-validator');
const Timetable = require('../models/Timetable');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('./routeHelpers');
const { validateWeekValue } = require('./timetableHelpers');
const {
  getTimetables,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  getConflicts,
  optimizeTimetable,
  applyFixes,
  seedFromSetup,
  approveTimetable,
  publishTimetable,
  clearTimetableData,
} = require('../controllers/timetableController');

const router = express.Router();
const protectedWrite = [protect];

const timetableValidation = [
  // Keeping validation flexible for both courseId (HEAD) and subjectId (Analytics)
  body('roomId', 'Room is required').optional().isMongoId(),
];

const idValidation = [param('id', 'Invalid timetable id').isMongoId()];

/* ─────────────────────────────────────────────────────────────
   IMPORTANT: Named / action routes MUST come before /:id routes
   so Express does not try to match "conflicts" / "seed" as an id.
───────────────────────────────────────────────────────────── */

/* ── Conflict detection ── */
router.get('/conflicts', getConflicts);

/* ── AI Optimization ── */
router.post('/optimize', optimizeTimetable);
router.post('/apply-fixes', applyFixes);

/* ── Seed DB from latest AISetup ── */
router.post('/seed', seedFromSetup);

/* ── Clear all timetable module data ── */
router.post('/clear', clearTimetableData);
router.delete('/clear', clearTimetableData);

/* ── Approve & Publish workflow ── */
router.put('/approve', approveTimetable);
router.put('/publish', publishTimetable);

// Analytics Branch Controllers & Standard CRUD
router.get('/', getTimetables);
router.post('/', protectedWrite, timetableValidation, handleValidationErrors, createTimetable);
router.put('/:id', [...protectedWrite, ...idValidation, ...timetableValidation], handleValidationErrors, updateTimetable);
router.delete('/:id', [...protectedWrite, ...idValidation], handleValidationErrors, deleteTimetable);

module.exports = router;
