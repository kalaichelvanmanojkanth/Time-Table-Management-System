const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { teacherRouter, subjectRouter, roomRouter, resourceRouter } = require('./routes/resourceRoutes');
const errorHandler = require('./middleware/errorHandler');

// Connect to database
connectDB();

const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://yourdomain.com' 
      : 'http://localhost:5173',
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Routes
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/users',    require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));

// AI Scheduling Routes
app.use('/api/schedule',    require('./routes/scheduleRoutes'));
app.use('/api/ai',          require('./routes/aiRoutes'));
app.use('/api/ai-setup',    require('./routes/aiSetupRoutes'));

// Timetable Routes (real DB data — conflict detection + optimization)
// All timetable endpoints are under /api/timetables:
//   GET  /api/timetables               → fetch all entries
//   GET  /api/timetables/conflicts      → conflict detection
//   POST /api/timetables/optimize       → AI greedy optimizer
//   POST /api/timetables/apply-fixes    → write optimized data to DB
//   POST /api/timetables/seed           → seed from AI Setup
app.use('/api/timetables', require('./routes/timetableRoutes'));

// Resource routes (Teachers, Subjects, Rooms — full CRUD)
app.use('/api/teachers',  teacherRouter);
app.use('/api/subjects',  subjectRouter);
app.use('/api/rooms',     roomRouter);
app.use('/api/resource',  resourceRouter); // POST /api/resource/seed-samples

// Health check route with DB status
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const stateMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };
  res.json({
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

// Error handling middleware (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});
