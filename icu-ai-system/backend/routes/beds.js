const express = require('express');
const Bed = require('../models/Bed');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  findOptimalBed,
  allocateBed,
  releaseBed,
  getStepDownRecommendations,
  getEscalationRecommendations,
  getWardOccupancy
} = require('../services/bedAllocation');
const logger = require('../utils/logger');

const router = express.Router();

// GET all beds
router.get('/', verifyToken, async (req, res) => {
  try {
    const { roomType, status, ward } = req.query;
    const filter = {};
    if (roomType) filter.roomType = roomType;
    if (status) filter.status = status;
    if (ward) filter.ward = ward;

    const beds = await Bed.find(filter).populate('patientId', 'name age status riskScore').sort({ bedNumber: 1 });
    res.json(beds);
  } catch (err) {
    logger.error('Error fetching beds:', err);
    res.status(500).json({ error: 'Failed to fetch beds' });
  }
});

// GET bed occupancy stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const wardOccupancy = await getWardOccupancy();
    const totalBeds = await Bed.countDocuments();
    const occupied = await Bed.countDocuments({ status: 'occupied' });
    const available = await Bed.countDocuments({ status: 'available' });
    const maintenance = await Bed.countDocuments({ status: 'maintenance' });

    const byType = {
      icu: {
        total: await Bed.countDocuments({ roomType: 'icu' }),
        occupied: await Bed.countDocuments({ roomType: 'icu', status: 'occupied' }),
        available: await Bed.countDocuments({ roomType: 'icu', status: 'available' })
      },
      normal: {
        total: await Bed.countDocuments({ roomType: 'normal' }),
        occupied: await Bed.countDocuments({ roomType: 'normal', status: 'occupied' }),
        available: await Bed.countDocuments({ roomType: 'normal', status: 'available' })
      },
      isolation: {
        total: await Bed.countDocuments({ roomType: 'isolation' }),
        occupied: await Bed.countDocuments({ roomType: 'isolation', status: 'occupied' }),
        available: await Bed.countDocuments({ roomType: 'isolation', status: 'available' })
      },
      'step-down': {
        total: await Bed.countDocuments({ roomType: 'step-down' }),
        occupied: await Bed.countDocuments({ roomType: 'step-down', status: 'occupied' }),
        available: await Bed.countDocuments({ roomType: 'step-down', status: 'available' })
      }
    };

    res.json({ totalBeds, occupied, available, maintenance, byType, wardOccupancy });
  } catch (err) {
    logger.error('Error fetching bed stats:', err);
    res.status(500).json({ error: 'Failed to fetch bed stats' });
  }
});

// POST find optimal bed for patient
router.post('/recommend', verifyToken, async (req, res) => {
  try {
    const result = await findOptimalBed(req.body);
    res.json(result);
  } catch (err) {
    logger.error('Error recommending bed:', err);
    res.status(500).json({ error: 'Failed to get bed recommendation' });
  }
});

// POST allocate bed
router.post('/allocate', verifyToken, requireRole('doctor'), async (req, res) => {
  try {
    const { bedId, patientId } = req.body;
    if (!bedId || !patientId) {
      return res.status(400).json({ error: 'bedId and patientId are required' });
    }
    const result = await allocateBed(bedId, patientId);

    const io = req.app.get('io');
    io.emit('bedAllocated', result);

    res.json(result);
  } catch (err) {
    logger.error('Error allocating bed:', err);
    res.status(400).json({ error: err.message });
  }
});

// POST release bed
router.post('/release', verifyToken, requireRole('doctor'), async (req, res) => {
  try {
    const { bedId } = req.body;
    if (!bedId) return res.status(400).json({ error: 'bedId is required' });
    const bed = await releaseBed(bedId);

    const io = req.app.get('io');
    io.emit('bedReleased', bed);

    res.json(bed);
  } catch (err) {
    logger.error('Error releasing bed:', err);
    res.status(400).json({ error: err.message });
  }
});

// GET step-down recommendations
router.get('/recommendations/step-down', verifyToken, async (req, res) => {
  try {
    const recommendations = await getStepDownRecommendations();
    res.json(recommendations);
  } catch (err) {
    logger.error('Error getting step-down recommendations:', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// GET escalation recommendations
router.get('/recommendations/escalation', verifyToken, async (req, res) => {
  try {
    const recommendations = await getEscalationRecommendations();
    res.json(recommendations);
  } catch (err) {
    logger.error('Error getting escalation recommendations:', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

module.exports = router;
