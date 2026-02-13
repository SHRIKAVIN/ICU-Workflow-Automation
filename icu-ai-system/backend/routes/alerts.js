const express = require('express');
const Alert = require('../models/Alert');
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET all alerts
router.get('/', verifyToken, async (req, res) => {
  try {
    const { severity, limit: queryLimit } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;

    const limit = parseInt(queryLimit) || 50;
    const alerts = await Alert.find(filter)
      .populate('patientId', 'name bedNumber')
      .sort({ time: -1 })
      .limit(limit);
    res.json(alerts);
  } catch (err) {
    logger.error('Error fetching alerts:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// GET recent alerts (last 5)
router.get('/recent', verifyToken, async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate('patientId', 'name bedNumber')
      .sort({ time: -1 })
      .limit(5);
    res.json(alerts);
  } catch (err) {
    logger.error('Error fetching recent alerts:', err);
    res.status(500).json({ error: 'Failed to fetch recent alerts' });
  }
});

// PUT acknowledge alert
router.put('/:id/acknowledge', verifyToken, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true, acknowledgedBy: req.user.name },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const io = req.app.get('io');
    io.emit('alertAcknowledged', alert);

    res.json(alert);
  } catch (err) {
    logger.error('Error acknowledging alert:', err);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

module.exports = router;
