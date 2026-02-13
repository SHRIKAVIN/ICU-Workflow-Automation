const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'icu-super-secret-key-2026';

// Hardcoded users for demo
const USERS = [
  { email: 'doctor@test.com', password: '123', role: 'doctor', name: 'Dr. Sarah Wilson' },
  { email: 'nurse@test.com', password: '123', role: 'nurse', name: 'Nurse Amy Chen' },
  { email: 'admin@test.com', password: '123', role: 'doctor', name: 'Admin User' }
];

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { email: user.email, role: user.role, name: user.name }
  });
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: { email: decoded.email, role: decoded.role, name: decoded.name } });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
