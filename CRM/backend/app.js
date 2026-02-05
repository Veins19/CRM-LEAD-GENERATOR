// backend/app.js

const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./db');
const apiKeyAuth = require('./middleware/apiKeyAuth');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Connect to MongoDB using centralized db.js
connectDB();

// Logging requests to terminal
app.use(morgan('dev'));

// Parse JSON bodies
app.use(express.json());

// Enable CORS for frontend (atomic compatibility)
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Healthcheck endpoint
app.get('/', (req, res) => {
  res.send('CRM Backend is running 🚀');
});

// API routes
app.use('/api/leads', require('./routes/leads'));
app.use('/api/users', require('./routes/users'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/password', require('./routes/password'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/notifications', require('./routes/notifications'));

// Integration API (for lead-gen + automation projects) – protected by API key
app.use('/api/integrations', apiKeyAuth, require('./routes/integrations'));

// 404 handler for unmapped routes
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Centralized error handling (atomic logs)
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is up on http://localhost:${PORT}`);
});
