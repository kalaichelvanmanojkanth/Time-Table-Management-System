const mongoose = require('mongoose');

const ROOM_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s./-]*$/;
const ROOM_TYPE_PATTERN = /^[A-Za-z][A-Za-z\s&/-]*$/;

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      unique: true,
      maxlength: [80, 'Room name cannot exceed 80 characters'],
      match: [
        ROOM_NAME_PATTERN,
        'Room name can only contain letters, numbers, spaces, periods, slashes, and hyphens',
      ],
    },
    capacity: {
      type: Number,
      required: [true, 'Room capacity is required'],
      min: [1, 'Room capacity must be at least 1'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Room capacity must be an integer',
      },
    },
    type: {
      type: String,
      required: [true, 'Room type is required'],
      trim: true,
      maxlength: [80, 'Room type cannot exceed 80 characters'],
      match: [
        ROOM_TYPE_PATTERN,
        'Room type can only contain letters, spaces, ampersands, slashes, and hyphens',
      ],
    },
    status: {
      type: String,
      default: 'available',
    },
    building: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Room', roomSchema);
