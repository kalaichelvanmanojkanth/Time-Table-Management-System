const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema(
  {
    subjectId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Subject',  required: true },
    teacherId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher',  required: true },
    roomId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Room',     required: true },
    day:        { type: String, required: true },
    startTime:  { type: String, required: true },
    endTime:    { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Timetable', TimetableSchema);
