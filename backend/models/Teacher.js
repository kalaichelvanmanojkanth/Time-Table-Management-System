const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true, unique: true },
    email:      { type: String, trim: true, lowercase: true, default: '' },
    department: { type: String, trim: true, default: '' },
    isActive:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Teacher', teacherSchema);
