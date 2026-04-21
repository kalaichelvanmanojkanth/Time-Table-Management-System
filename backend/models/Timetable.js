const mongoose = require('mongoose');

const WEEK_PATTERN = /^\d{4}-W\d{2}$/;

const timetableSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecturer',
      required: [true, 'Lecturer is required'],
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required'],
    },
    timeslotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot',
      required: [true, 'Time slot is required'],
    },
    week: {
      type: String,
      required: [true, 'Week is required'],
      trim: true,
      match: [WEEK_PATTERN, 'Week must follow the YYYY-Www format'],
    },
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
