const mongoose = require('mongoose');

/* ────────────────────────────────────────────────────────────
   AISetup Model
   Persists the timetable scheduling configuration to MongoDB.
   One document per save; GET /api/ai-setup returns the latest.
──────────────────────────────────────────────────────────── */
const aiSetupSchema = new mongoose.Schema(
  {
    teachers:    { type: [String], required: true },
    subjects:    { type: [String], required: true },
    rooms:       { type: [String], required: true },
    workingDays: { type: [String], required: true },
    timeSlots:   { type: Number, default: 6, min: 1, max: 12 },
    constraints: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AISetup', aiSetupSchema);
