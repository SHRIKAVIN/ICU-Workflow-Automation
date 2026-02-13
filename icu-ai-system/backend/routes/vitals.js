const express = require('express');
const Vitals = require('../models/Vitals');
const Patient = require('../models/Patient');
const Alert = require('../models/Alert');
const { verifyToken } = require('../middleware/auth');
const { predictRisk } = require('../services/aiService');
const logger = require('../utils/logger');

const router = express.Router();

// POST new vitals reading
router.post('/', verifyToken, async (req, res) => {
  try {
    const { patientId, heartRate, spo2, temperature, bloodPressureSystolic, bloodPressureDiastolic, respiratoryRate } = req.body;

    if (!patientId || !heartRate || !spo2 || !temperature) {
      return res.status(400).json({ error: 'patientId, heartRate, spo2, and temperature are required.' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Call AI service for risk prediction
    const prediction = await predictRisk({
      heartRate, spo2, temperature,
      bloodPressureSystolic: bloodPressureSystolic || 120,
      bloodPressureDiastolic: bloodPressureDiastolic || 80,
      respiratoryRate: respiratoryRate || 16
    });

    const vitals = new Vitals({
      patientId,
      heartRate,
      spo2,
      temperature,
      bloodPressureSystolic: bloodPressureSystolic || 120,
      bloodPressureDiastolic: bloodPressureDiastolic || 80,
      respiratoryRate: respiratoryRate || 16,
      riskScore: prediction.risk_score,
      riskLevel: prediction.level
    });
    await vitals.save();

    // Update patient risk score and status
    const updateData = { riskScore: prediction.risk_score };
    if (prediction.risk_score > 0.7) {
      updateData.status = 'critical';
    } else if (prediction.risk_score > 0.4) {
      updateData.status = 'warning';
    }
    await Patient.findByIdAndUpdate(patientId, updateData);

    // Create alert if risk is high
    if (prediction.risk_score > 0.7) {
      const alertMessages = [];
      if (heartRate > 110) alertMessages.push(`Critical HR: ${heartRate} bpm`);
      if (spo2 < 92) alertMessages.push(`Low SpO2: ${spo2}%`);
      if (temperature > 38.5) alertMessages.push(`High Temp: ${temperature}°C`);

      const alert = new Alert({
        patientId,
        message: `${patient.name} (Bed ${patient.bedNumber}): ${alertMessages.join(', ') || 'High risk detected'}`,
        severity: 'critical',
        type: 'vitals'
      });
      await alert.save();

      const io = req.app.get('io');
      io.emit('newAlert', { ...alert.toObject(), patientName: patient.name });
    } else if (prediction.risk_score > 0.4) {
      const alert = new Alert({
        patientId,
        message: `${patient.name} (Bed ${patient.bedNumber}): Moderate risk - monitoring closely`,
        severity: 'medium',
        type: 'risk'
      });
      await alert.save();
    }

    // Emit real-time vitals update
    const io = req.app.get('io');
    io.emit('updateVitals', {
      patientId,
      vitals: vitals.toObject(),
      riskScore: prediction.risk_score,
      riskLevel: prediction.level,
      patientName: patient.name,
      bedNumber: patient.bedNumber
    });
    io.to(`patient-${patientId}`).emit('patientVitals', vitals.toObject());

    res.status(201).json(vitals);
  } catch (err) {
    logger.error('Error recording vitals:', err);
    res.status(500).json({ error: 'Failed to record vitals' });
  }
});

// GET vitals for a patient
router.get('/:patientId', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const vitals = await Vitals.find({ patientId: req.params.patientId })
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json(vitals.reverse());
  } catch (err) {
    logger.error('Error fetching vitals:', err);
    res.status(500).json({ error: 'Failed to fetch vitals' });
  }
});

// GET latest vitals for all patients
router.get('/latest/all', verifyToken, async (req, res) => {
  try {
    const patients = await Patient.find({ status: { $ne: 'discharged' } });
    const latestVitals = await Promise.all(
      patients.map(async (p) => {
        const vitals = await Vitals.findOne({ patientId: p._id }).sort({ timestamp: -1 });
        return { patient: p, vitals };
      })
    );
    res.json(latestVitals);
  } catch (err) {
    logger.error('Error fetching latest vitals:', err);
    res.status(500).json({ error: 'Failed to fetch latest vitals' });
  }
});

module.exports = router;
