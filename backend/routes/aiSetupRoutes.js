const express = require('express');
const router  = express.Router();
const {
  saveAISetup,
  getLatestAISetup,
  getAllAISetups,
  deleteAISetup,
} = require('../controllers/aiSetupController');

// POST  /api/ai-setup        → save new setup to MongoDB
router.post('/',         saveAISetup);

// GET   /api/ai-setup        → get the most recent setup
router.get('/',          getLatestAISetup);

// GET   /api/ai-setup/all    → get all saved setups (newest first)
router.get('/all',       getAllAISetups);

// DELETE /api/ai-setup/:id   → delete a specific saved setup
router.delete('/:id',    deleteAISetup);

module.exports = router;
