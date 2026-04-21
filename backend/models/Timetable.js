const mongoose = require('mongoose');

const WEEK_PATTERN = /^\d{4}-W\d{2}$/;

const timetableSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: false,
    },
    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecturer',
      required: false,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: false,
    },
    timeslotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot',
      required: false,
    },
    week: {
      type: String,
      required: false,
      trim: true,
      match: [WEEK_PATTERN, 'Week must follow the YYYY-Www format'],
    },

    // Analytics/AI fields
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: false },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: false },
    day: { type: String, required: false },
    startTime: { type: String, required: false },
    endTime: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);

timeTableIndexes(timetableSchema);

function timeTableIndexes(schema) {
  schema.index({ week: 1 });
  schema.index({ week: 1, courseId: 1 });
  schema.index({ week: 1, lecturerId: 1 });
  schema.index({ week: 1, roomId: 1 });
  schema.index({ week: 1, timeslotId: 1 });
}

module.exports = mongoose.model('Timetable', timetableSchema);
