const express = require('express');
const router  = express.Router();
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
} = require('../controllers/timetableController');

/* ─────────────────────────────────────────────────────────────
   IMPORTANT: Named / action routes MUST come before /:id routes
   so Express does not try to match "conflicts" / "seed" as an id.
───────────────────────────────────────────────────────────── */

/* ── Conflict detection ── */
router.get('/conflicts',    getConflicts);

/* ── AI Optimization ── */
router.post('/optimize',    optimizeTimetable);
router.post('/apply-fixes', applyFixes);

/* ── Seed DB from latest AISetup ── */
router.post('/seed',        seedFromSetup);

/* ── Approve & Publish workflow ── */
router.put('/approve',      approveTimetable);
router.put('/publish',      publishTimetable);

/* ── Collection CRUD (must come after named routes) ── */
router.get('/',             getTimetables);
router.post('/',            createTimetable);

/* ── Single-document routes (parameterised — must be last) ── */
router.put('/:id',          updateTimetable);
router.delete('/:id',       deleteTimetable);

module.exports = router;
