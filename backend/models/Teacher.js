const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, trim: true },
    department:     { type: String, required: true, trim: true },
    subjects:       [{ type: String, trim: true }],
    maxWeeklyHours: { type: Number, default: 20 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Teacher', TeacherSchema);
