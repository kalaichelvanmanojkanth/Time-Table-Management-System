const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '.env'),
});

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const app = require('./app');

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
