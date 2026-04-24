#!/usr/bin/env node
/**
 * Script: adjustRoomUtilization.js
 * Purpose: Create timetable slots to bring room utilization up to a target percentage.
 * Usage:
 *   MONGO_URI="..." node backend/scripts/adjustRoomUtilization.js --target=50 --rooms=roomId1,roomId2 --weekly=40
 * If no --rooms is supplied the script will process all rooms.
 * If no teacherId/subjectId supplied the script will create simple synthetic records to attach slots to.
 */

const mongoose = require('mongoose');
const path = require('path');

// If a backend .env file exists, load it so the script can run without manually
// exporting MONGO_URI. This is safe for local/dev use.
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch (err) {
  // ignore if dotenv isn't installed or file missing
}

const Timetable = require('../models/Timetable');
const Room = require('../models/Room');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');

function toMin(t) {
  if (!t || typeof t !== 'string') return 0;
  const [h, m] = t.trim().split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function minsToHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

async function main() {
  // Lightweight argv parser to avoid external dependency on `minimist`.
  const rawArgs = process.argv.slice(2);
  const argv = {};
  rawArgs.forEach(arg => {
    if (arg.startsWith('--')) {
      const [k, ...rest] = arg.slice(2).split('=');
      argv[k] = rest.length ? rest.join('=') : true;
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      // support -t50 or -t=50 or -t 50 (latter handled below)
      const match = key.match(/^([a-zA-Z])(.+)$/);
      if (match) {
        argv[match[1]] = match[2];
      } else {
        argv[key] = true;
      }
    }
  });

  // Also support space-separated values like --target 50
  for (let i = 0; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a.startsWith('--') && !a.includes('=')) {
      const key = a.slice(2);
      const next = rawArgs[i + 1];
      if (next && !next.startsWith('-')) {
        argv[key] = next;
      }
    }
    if (a.startsWith('-') && a.length === 2) {
      const key = a.slice(1);
      const next = rawArgs[i + 1];
      if (next && !next.startsWith('-')) {
        argv[key] = next;
      }
    }
  }

  const targetPct = Number(argv.target || argv.t || 50);
  const weeklyHours = Number(argv.weekly || argv.w || 40);
  const roomsArg = argv.rooms || argv.r || '';
  const roomIds = roomsArg ? String(roomsArg).split(',').map(s => s.trim()).filter(Boolean) : null;
  const providedTeacher = argv.teacherId || argv.teacher || argv.te || null;
  const providedSubject = argv.subjectId || argv.subject || argv.sub || null;

  if (!process.env.MONGO_URI) {
    console.error('Error: set MONGO_URI environment variable to your MongoDB connection string');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected.');

  // Load rooms
  const rooms = roomIds && roomIds.length > 0 ? await Room.find({ _id: { $in: roomIds } }) : await Room.find();
  if (!rooms || rooms.length === 0) {
    console.log('No rooms found, exiting.');
    process.exit(0);
  }

  // Ensure we have a teacher and subject to attach synthetic slots to
  let teacherId = providedTeacher;
  let subjectId = providedSubject;

  if (!teacherId) {
    let t = await Teacher.findOne({ name: /Synthetic/i });
    if (!t) {
      t = await Teacher.create({ name: 'Synthetic Teacher', department: 'Synthetic', maxWeeklyHours: 40 });
      console.log('Created synthetic teacher', t._id.toString());
    }
    teacherId = t._id;
  }

    if (!subjectId) {
    let s = await Subject.findOne({ name: /Synthetic/i });
    if (!s) {
      // Subject requires `department` per schema
      s = await Subject.create({ name: 'Synthetic Subject', department: 'Synthetic', weeklyHours: 1 });
      console.log('Created synthetic subject', s._id.toString());
    }
    subjectId = s._id;
  }

  const availMinutes = weeklyHours * 60;

  for (const room of rooms) {
    // sum existing scheduled minutes for this room
    const entries = await Timetable.find({ roomId: room._id });
    const currentMinutes = entries.reduce((sum, e) => {
      const s = toMin(e.startTime);
      const en = toMin(e.endTime);
      if (en > s) return sum + (en - s);
      return sum + 60; // fallback
    }, 0);

    const targetMinutes = Math.round((targetPct / 100) * availMinutes);
    const needMinutes = Math.max(0, targetMinutes - currentMinutes);

    console.log(`Room ${room.name} (${room._id}): current ${currentMinutes}m, target ${targetMinutes}m, need ${needMinutes}m`);

    if (needMinutes <= 0) {
      console.log('  already meets or exceeds target, skipping.');
      continue;
    }

    // Create slots on Saturday starting at 08:00, 1-hour slots until filled
    const slotSize = 60; // minutes
    let remaining = needMinutes;
    let startHour = 8;
    const day = 'Sat';

    const created = [];
    while (remaining > 0) {
      const minutes = Math.min(slotSize, remaining);
      const startMin = startHour * 60;
      const endMin = startMin + minutes;
      const startTime = minsToHHMM(startMin);
      const endTime = minsToHHMM(endMin);

      const doc = await Timetable.create({
        subjectId: subjectId,
        teacherId: teacherId,
        roomId: room._id,
        day: day,
        startTime: startTime,
        endTime: endTime,
      });
      created.push(doc);

      remaining -= minutes;
      startHour += Math.ceil(minutes / 60);
      // safety: don't create infinite loop
      if (startHour > 22) {
        // wrap to next day (Mon)
        startHour = 8;
      }
    }

    console.log(`  Created ${created.length} synthetic timetable entries for room ${room.name}`);
  }

  console.log('Done.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error', err);
  process.exit(1);
});
