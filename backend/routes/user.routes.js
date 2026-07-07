const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

// Usuario autenticado
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// Comprobar si es coordinador
router.get('/check-role', requireAuth, (req, res) => {
  res.json({ isCoordinator: isCoordinator(req) });
});

// Obtener todos los usuarios (solo coordinadores)
router.get('/', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, email, is_coordinator FROM users'
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener solo voluntarios (para el selector de pacientes)
router.get('/volunteers', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores' });
  }

  try {
    const [rows] = await db.execute(`
      SELECT id, email
      FROM users
      WHERE is_coordinator = 0
      ORDER BY email
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;