const AISetup = require('../models/AISetup');

/* ────────────────────────────────────────────────────────
   POST /api/ai-setup
   Validates and saves timetable setup to MongoDB.
   Returns the saved document.
──────────────────────────────────────────────────────── */
const saveAISetup = async (req, res) => {
  try {
    const { teachers, subjects, rooms, workingDays, timeSlots, constraints } = req.body;

    /* ── Validation ── */
    const errors = [];
    if (!teachers?.length)    errors.push('At least one teacher is required');
    if (!subjects?.length)    errors.push('At least one subject is required');
    if (!rooms?.length)       errors.push('At least one room is required');
    if (!workingDays?.length) errors.push('At least one working day is required');
    const ts = Number(timeSlots);
    if (!ts || ts < 1 || ts > 12) errors.push('Time slots must be between 1 and 12');

    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    /* ── Save to MongoDB ── */
    const doc = await AISetup.create({
      teachers,
      subjects,
      rooms,
      workingDays,
      timeSlots: ts,
      constraints: constraints || '',
    });

    res.status(201).json({
      success: true,
      message: 'Setup saved to database ✓',
      data: doc,
    });
  } catch (err) {
    console.error('[AISetup] saveAISetup error:', err.stack || err.message);
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
};

/* ────────────────────────────────────────────────────────
   GET /api/ai-setup
   Returns the most recently saved setup document.
   404 if none exists yet.
──────────────────────────────────────────────────────── */
const getLatestAISetup = async (req, res) => {
  try {
    const doc = await AISetup.findOne().sort({ createdAt: -1 });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'No setup found in database' });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('[AISetup] getLatestAISetup error:', err.stack || err.message);
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
};

/* ────────────────────────────────────────────────────────
   GET /api/ai-setup/all
   Returns all saved setups (newest first), max 20.
──────────────────────────────────────────────────────── */
const getAllAISetups = async (req, res) => {
  try {
    const docs = await AISetup.find().sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    console.error('[AISetup] getAllAISetups error:', err.stack || err.message);
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
};

/* ────────────────────────────────────────────────────────
   DELETE /api/ai-setup/:id
   Remove a specific saved setup.
──────────────────────────────────────────────────────── */
const deleteAISetup = async (req, res) => {
  try {
    const doc = await AISetup.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Setup not found' });
    res.json({ success: true, message: 'Setup deleted' });
  } catch (err) {
    console.error('[AISetup] deleteAISetup error:', err.stack || err.message);
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
};

module.exports = { saveAISetup, getLatestAISetup, getAllAISetups, deleteAISetup };
