const express = require('express');
const router  = express.Router();
const { runAIScheduling } = require('../controllers/aiController');

// POST /api/ai/run — run AI conflict detection + optimization
router.post('/run', runAIScheduling);

module.exports = router;
