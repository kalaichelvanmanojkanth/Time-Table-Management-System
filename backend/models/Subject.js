const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    department:  { type: String, required: true, trim: true },
    weeklyHours: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subject', SubjectSchema);
