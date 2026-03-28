const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5176',
  'http://127.0.0.1:5176',
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
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
