const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, unique: true },
    code:        { type: String, trim: true, default: '' },
    credits:     { type: Number, default: 3, min: 1, max: 6 },
    department:  { type: String, required: true, trim: true },
    weeklyHours: { type: Number, required: true, default: 0 },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subject', subjectSchema);
