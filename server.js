const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./api/auth/login'));
app.use('/api/auth', require('./api/auth/register'));
app.use('/api/ai', require('./api/ai/match'));
app.use('/api/ai', require('./api/ai/predict'));
app.use('/api/emergency', require('./api/emergency'));
app.use('/api/inventory', require('./api/inventory'));
app.use('/api/requests', require('./api/requests'));
app.use('/api/admin', require('./api/admin'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
