const express = require('express');
const router  = express.Router();
const {
  getSummary,
  getWorkload,
  getRoomUtilization,
  getSubjectDistribution,
  getWeeklyTrend,
} = require('../controllers/analyticsController');

// GET /api/analytics/summary      — live KPI counts
router.get('/summary',              getSummary);

// GET /api/analytics/workload      — teacher workload computed server-side
router.get('/workload',             getWorkload);

// GET /api/analytics/room-utilization
router.get('/room-utilization',     getRoomUtilization);

// GET /api/analytics/subject-distribution
router.get('/subject-distribution', getSubjectDistribution);

// GET /api/analytics/weekly-trend
router.get('/weekly-trend',         getWeeklyTrend);

module.exports = router;
