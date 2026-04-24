const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true, unique: true },
    type:     { type: String, trim: true, enum: ['Lecture Hall', 'Seminar Room', 'Lab', 'Auditorium', 'Tutorial Room', 'Other'], default: 'Lecture Hall' },
    capacity: { type: Number, default: 40, min: 1 },
    building: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
