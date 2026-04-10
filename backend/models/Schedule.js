const mongoose = require('mongoose');

const scheduleEntrySchema = new mongoose.Schema({
  teacher: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  room:    { type: String, required: true, trim: true },
  day:     { type: String, required: true, trim: true },
  time:    { type: String, required: true, trim: true },
});

const scheduleSchema = new mongoose.Schema(
  {
    name:        { type: String, default: 'Default Schedule' },
    teachers:    [{ type: String }],
    subjects:    [{ type: String }],
    rooms:       [{ type: String }],
    workingDays: [{ type: String }],
    timeSlots:   { type: Number, default: 6 },
    constraints: { type: String, default: '' },
    entries:     [scheduleEntrySchema],
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Schedule', scheduleSchema);
