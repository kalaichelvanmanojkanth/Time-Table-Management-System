const Room = require('../models/Room');

// GET all rooms
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    console.log(`[API] /rooms GET → sending ${rooms.length} records`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: rooms || [] });
  } catch (err) {
    console.error('[roomController] getRooms error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: 'Failed to fetch rooms', error: err.message });
  }
};

// POST create room
exports.createRoom = async (req, res) => {
  try {
    const room = await Room.create(req.body);
    console.log(`[API] /rooms POST → created room: ${room.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(201).json({ success: true, data: room });
  } catch (err) {
    console.error('[roomController] createRoom error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT update room
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    console.log(`[API] /rooms PUT → updated room: ${room.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, data: room });
  } catch (err) {
    console.error('[roomController] updateRoom error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE room
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    console.log(`[API] /rooms DELETE → deleted room: ${room.name}`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, message: 'Room deleted' });
  } catch (err) {
    console.error('[roomController] deleteRoom error:', err.message);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, message: err.message });
  }
};
