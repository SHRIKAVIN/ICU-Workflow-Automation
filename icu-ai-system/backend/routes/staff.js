const express = require('express');
const Staff = require('../models/Staff');
const { verifyToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET all staff
router.get('/', verifyToken, async (req, res) => {
  try {
    const { role, shift, onDuty } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (shift) filter.shift = shift;
    if (onDuty !== undefined) filter.isOnDuty = onDuty === 'true';

    const staff = await Staff.find(filter).sort({ name: 1 });
    res.json(staff);
  } catch (err) {
    logger.error('Error fetching staff:', err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// POST create staff
router.post('/', verifyToken, requireRole('doctor'), async (req, res) => {
  try {
    const member = new Staff(req.body);
    await member.save();
    res.status(201).json(member);
  } catch (err) {
    logger.error('Error creating staff:', err);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

// PUT update staff tasks
router.put('/:id/tasks', verifyToken, async (req, res) => {
  try {
    const member = await Staff.findByIdAndUpdate(
      req.params.id,
      { tasks: req.body.tasks },
      { new: true }
    );
    if (!member) return res.status(404).json({ error: 'Staff member not found' });
    res.json(member);
  } catch (err) {
    logger.error('Error updating tasks:', err);
    res.status(500).json({ error: 'Failed to update tasks' });
  }
});

module.exports = router;
