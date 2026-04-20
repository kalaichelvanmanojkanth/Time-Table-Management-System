const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars FIRST — before any other module that reads them
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// ── Graceful unhandled rejection guard ───────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('🔴 Unhandled Rejection:', reason);
  // Do NOT exit — keep the server alive so health checks still pass
});

process.on('uncaughtException', (err) => {
  console.error('🔴 Uncaught Exception:', err.message);
});

// Connect to database (non-fatal if it fails — server still boots)
connectDB();

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',   // fallback dev port
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        process.env.NODE_ENV !== 'production' ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── UTF-8 encoding enforcement ────────────────────────────────────────────────
// Force UTF-8 charset on every JSON response to prevent garbled text
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson(body);
  };
  next();
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/users',      require('./routes/userRoutes'));
app.use('/api/products',   require('./routes/productRoutes'));

// Timetable Analytics Routes
app.use('/api/lecturers',  require('./routes/lecturerRoutes'));
app.use('/api/subjects',   require('./routes/subjectRoutes'));
app.use('/api/rooms',      require('./routes/roomRoutes'));
app.use('/api/timetables', require('./routes/timetableRoutes'));
app.use('/api/analytics',  require('./routes/analyticsRoutes'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const dbState   = mongoose.connection.readyState;
  const stateMap  = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
  const connected = dbState === 1;
  res.status(connected ? 200 : 503).json({
    success:  connected,
    message:  connected ? 'API is running — DB connected' : 'API running but DB not connected',
    database: {
      status:    stateMap[dbState] || 'Unknown',
      connected,
      host:      connected ? mongoose.connection.host : null,
      name:      connected ? mongoose.connection.name : null,
    },
    tip: connected ? null : [
      'MongoDB Atlas is not reachable.',
      '1. Go to https://cloud.mongodb.com → Network Access',
      '2. Add IP Address → "Allow Access from Anywhere" (0.0.0.0/0) for dev',
      '3. Confirm, wait ~30 seconds, then restart the backend.',
    ],
    routes: [
      'GET  /api/health',
      'GET  /api/lecturers',
      'GET  /api/subjects',
      'GET  /api/rooms',
      'GET  /api/timetables',
      'GET  /api/analytics/summary',
      'GET  /api/analytics/workload',
      'GET  /api/analytics/room-utilization',
      'GET  /api/analytics/subject-distribution',
      'GET  /api/analytics/weekly-trend',
    ],
  });
});

// ── 404 handler for unknown routes ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Run: npm run dev:clean   — to free port ${PORT}, then retry.`);
    console.error(`   Or kill the process manually: netstat -ano | findstr :${PORT}\n`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});
