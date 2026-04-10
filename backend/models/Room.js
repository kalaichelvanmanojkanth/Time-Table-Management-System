const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    type:     { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, default: 0 },
    status:   { type: String, default: 'available' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', RoomSchema);
