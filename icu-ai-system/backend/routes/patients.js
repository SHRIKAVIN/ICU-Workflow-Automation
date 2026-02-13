const express = require('express');
const Patient = require('../models/Patient');
const { verifyToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET all patients
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, roomType, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (roomType) filter.roomType = roomType;
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    const patients = await Patient.find(filter).sort({ updatedAt: -1 });
    res.json(patients);
  } catch (err) {
    logger.error('Error fetching patients:', err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// GET single patient
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    logger.error('Error fetching patient:', err);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// POST create patient (admin, doctor, nurse)
router.post('/', verifyToken, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
  try {
    const { name, age, bedNumber, status, roomType, diagnosis, gender, assignedDoctor, assignedNurse } = req.body;
    if (!name || !age || !bedNumber) {
      return res.status(400).json({ error: 'Name, age, and bed number are required.' });
    }
    const existing = await Patient.findOne({ bedNumber });
    if (existing) {
      return res.status(400).json({ error: `Bed ${bedNumber} is already occupied.` });
    }
    const patient = new Patient({
      name, age, bedNumber,
      status: status || 'stable',
      roomType: roomType || 'icu',
      diagnosis: diagnosis || '',
      gender: gender || 'Male',
      assignedDoctor: assignedDoctor || '',
      assignedNurse: assignedNurse || ''
    });
    await patient.save();

    const io = req.app.get('io');
    io.emit('patientAdded', patient);

    res.status(201).json(patient);
  } catch (err) {
    logger.error('Error creating patient:', err);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// PUT update patient (admin, doctor, nurse)
router.put('/:id', verifyToken, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const io = req.app.get('io');
    io.emit('patientUpdated', patient);

    res.json(patient);
  } catch (err) {
    logger.error('Error updating patient:', err);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// DELETE discharge patient (admin, doctor, nurse)
router.delete('/:id', verifyToken, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { status: 'discharged', dischargeDate: new Date() },
      { new: true }
    );
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const io = req.app.get('io');
    io.emit('patientDischarged', patient);

    res.json({ message: 'Patient discharged', patient });
  } catch (err) {
    logger.error('Error discharging patient:', err);
    res.status(500).json({ error: 'Failed to discharge patient' });
  }
});

// GET dashboard stats
router.get('/stats/dashboard', verifyToken, async (req, res) => {
  try {
    const total = await Patient.countDocuments({ status: { $ne: 'discharged' } });
    const critical = await Patient.countDocuments({ status: 'critical' });
    const warning = await Patient.countDocuments({ status: 'warning' });
    const stable = await Patient.countDocuments({ status: 'stable' });
    const icuOccupied = await Patient.countDocuments({ roomType: 'icu', status: { $ne: 'discharged' } });
    const normalOccupied = await Patient.countDocuments({ roomType: 'normal', status: { $ne: 'discharged' } });

    res.json({
      totalBeds: 30,
      icuBeds: 15,
      normalBeds: 15,
      occupied: total,
      critical,
      warning,
      stable,
      icuOccupied,
      normalOccupied
    });
  } catch (err) {
    logger.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
