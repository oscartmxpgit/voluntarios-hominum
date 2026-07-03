const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

router.get('/me', requireAuth, (req, res) => res.json(req.user));
router.get('/check-role', requireAuth, (req, res) => res.json({ isCoordinator: isCoordinator(req) }));
router.get('/', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) return res.status(403).json({ error: 'Solo coordinadores' });
  const [rows] = await db.execute('SELECT id, email, is_coordinator FROM users');
  res.json(rows);
});

module.exports = router;