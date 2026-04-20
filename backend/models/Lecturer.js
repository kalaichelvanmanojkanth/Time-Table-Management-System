const mongoose = require('mongoose');

const LecturerSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, trim: true },
    department:     { type: String, required: true, trim: true },
    subjects:       [{ type: String, trim: true }],
    maxWeeklyHours: { type: Number, default: 20 },
  },
  { timestamps: true, collection: 'lecturers' }
);

module.exports = mongoose.model('Lecturer', LecturerSchema);
