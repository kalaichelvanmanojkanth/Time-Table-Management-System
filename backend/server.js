const path = require('path');

require('dotenv').config({
  // Load the backend env file reliably even when the server is started
  // from the repository root via npm scripts.
  path: path.join(__dirname, '.env'),
});

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
