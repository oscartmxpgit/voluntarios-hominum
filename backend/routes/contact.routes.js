const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

router.post('/', requireAuth, async (req, res) => {
  const { name, email, phone, message } = req.body;
  const [result] = await db.execute('INSERT INTO contact_submissions (name, email, phone, message) VALUES (?, ?, ?, ?)', [name, email, phone, message]);
  res.status(201).json({ id: result.insertId });
});

router.get('/', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) return res.status(403).json({ error: 'Solo coordinadores' });
  const [rows] = await db.execute('SELECT * FROM contact_submissions ORDER BY created_at DESC');
  res.json(rows);
});

router.patch('/:id', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) return res.status(403).json({ error: 'Solo coordinadores' });
  await db.execute('UPDATE contact_submissions SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?', [req.body.status, req.params.id]);
  res.json({ message: 'Estado actualizado' });
});

module.exports = router;