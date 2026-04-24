const mongoose = require('mongoose');

const WEEK_PATTERN = /^\d{4}-W\d{2}$/;

const timetableSchema = new mongoose.Schema(
  {
    /* ── Identity fields (string names — primary data for AI) ── */
    subject: { type: String, trim: true },
    teacher: { type: String, trim: true },
    room:    { type: String, trim: true },

    /* ── Relational ObjectIds (used by Main Analytics) ── */
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: false },
    lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecturer', required: false },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: false },
    timeslotId: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', required: false },
    
    // Additional direct refs
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: false },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: false },

    /* ── Analytics properties ── */
    week: {
      type: String,
      required: false,
      trim: true,
      match: [WEEK_PATTERN, 'Week must follow the YYYY-Www format'],
    },

    /* ── Scheduling fields ── */
    day: {
      type: String,
      required: false,
      trim: true,
      // enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    },
    startTime: { type: String, required: false, trim: true },
    endTime:   { type: String, required: false, trim: true },
    slot:      { type: Number, default: 1 },

    /* ── Workflow status ── */
    status: {
      type:    String,
      enum:    ['draft', 'approved', 'published', 'conflict', 'optimized'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

/* ── Indexes ── */
timetableSchema.index({ day: 1, startTime: 1 });
timetableSchema.index({ teacher: 1, day: 1 });
timetableSchema.index({ status: 1 });

timeTableIndexes(timetableSchema);

function timeTableIndexes(schema) {
  schema.index({ week: 1 });
  schema.index({ week: 1, courseId: 1 });
  schema.index({ week: 1, lecturerId: 1 });
  schema.index({ week: 1, roomId: 1 });
  schema.index({ week: 1, timeslotId: 1 });
}

module.exports = mongoose.model('Timetable', timetableSchema);
