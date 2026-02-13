require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const vitalsRoutes = require('./routes/vitals');
const alertRoutes = require('./routes/alerts');
const bedRoutes = require('./routes/beds');
const staffRoutes = require('./routes/staff');

const { startVitalsSimulator } = require('./utils/generateVitals');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use(limiter);

// Make io accessible to routes
app.set('io', io);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/staff', staffRoutes);

// Socket.io
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('joinPatientRoom', (patientId) => {
    socket.join(`patient-${patientId}`);
    logger.info(`Socket ${socket.id} joined patient-${patientId}`);
  });

  socket.on('leavePatientRoom', (patientId) => {
    socket.leave(`patient-${patientId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    server.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`);
      // Start vitals simulator in dev
      if (process.env.NODE_ENV !== 'production') {
        startVitalsSimulator(io);
      }
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = { app, io };
