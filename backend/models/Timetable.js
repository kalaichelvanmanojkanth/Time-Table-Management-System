const mongoose = require('mongoose');

/* ────────────────────────────────────────────────────────────
   Timetable Model — Clean, production-ready schema
   ─────────────────────────────────────────────────────────
   Decision: store names as plain strings (teacher, subject, room)
   alongside the *Id fields so the system works without
   separate Teacher/Subject/Room collections.
   NO unique indexes → eliminates E11000 on re-seed.
──────────────────────────────────────────────────────────── */
const timetableSchema = new mongoose.Schema(
  {
    /* ── Identity fields (string names — primary data) ── */
    subject: { type: String, required: true, trim: true },
    teacher: { type: String, required: true, trim: true },
    room:    { type: String, required: true, trim: true },

    /* ── Optional ObjectId refs (for future ref-based collections) ── */
    subjectId: { type: String, default: '' },
    teacherId: { type: String, default: '' },
    roomId:    { type: String, default: '' },

    /* ── Scheduling fields ── */
    day: {
      type:     String,
      required: true,
      trim:     true,
      enum:     ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    },
    startTime: { type: String, required: true, trim: true }, // "08:00"
    endTime:   { type: String, required: true, trim: true }, // "09:00"
    slot:      { type: Number, default: 1 },                  // period number within the day

    /* ── Workflow status ── */
    status: {
      type:    String,
      enum:    ['draft', 'approved', 'published', 'conflict', 'optimized'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

/* ── Non-unique indexes for query speed only ── */
timetableSchema.index({ day: 1, startTime: 1 });
timetableSchema.index({ teacher: 1, day: 1 });
timetableSchema.index({ status: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
