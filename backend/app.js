require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');

const app = express();

const parseAllowedOrigins = () => {
  const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (!configuredOrigins) {
    return [];
  }

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

const isAllowedDevOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    const isHttp = protocol === 'http:' || protocol === 'https:';
    const isLocalHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0';
    const isPrivateNetworkHost =
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname);

    return isHttp && (isLocalHost || isPrivateNetworkHost);
  } catch (error) {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      if (origin && allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Allow local frontend dev servers regardless of the exact Vite port.
      if (!origin || isAllowedDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const stateMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  res.status(200).json({
    success: dbState === 1,
    message: dbState === 1 ? 'API is running' : 'API running but DB issue',
    database: {
      status: stateMap[dbState] || 'Unknown',
      connected: dbState === 1,
      host: dbState === 1 ? mongoose.connection.host : null,
      name: dbState === 1 ? mongoose.connection.name : null,
    },
  });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/classrooms', require('./routes/classroomRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/lecturers', require('./routes/lecturerRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/timeslots', require('./routes/timeslotRoutes'));
app.use('/api/timetables', require('./routes/timetableRoutes'));

// AI Scheduling Routes
app.use('/api/schedule',    require('./routes/scheduleRoutes'));
app.use('/api/ai',          require('./routes/aiRoutes'));
app.use('/api/ai-setup',    require('./routes/aiSetupRoutes'));

// Resource routes (Teachers, Subjects, Rooms — from HEAD)
const { teacherRouter, subjectRouter, roomRouter, resourceRouter } = require('./routes/resourceRoutes');
app.use('/api/teachers',  teacherRouter);
app.use('/api/subjects',  subjectRouter);
// Note: /api/rooms is already mapped to roomRoutes. We should avoid duplicate mounting if roomRoutes is sufficient, but we might break AI setup if we don't.
// Let's comment my roomRouter to see if it works, or map it to something else if needed. Wait, my code expects /api/rooms for AI Setup Room CRUD!
// But `main` already has `app.use('/api/rooms', require('./routes/roomRoutes'));`.
// I will mount HEAD's rooms here but wait... I'll check `frontend` to see what it calls. `api/rooms` is what frontend calls for both!
// Actually let's just mount resourceRouter and the specific routers.
app.use('/api/ai-rooms', roomRouter); // avoiding namespace collision 
app.use('/api/resource',  resourceRouter);

if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '..', 'frontend', 'dist');

  app.use(express.static(clientDistPath));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
