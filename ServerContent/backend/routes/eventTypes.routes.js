const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, title, start_datetime, end_datetime FROM events ORDER BY start_datetime ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) return res.status(403).json({ error: 'Solo coordinadores' });
  const { title, start_datetime, end_datetime } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO events (title, start_datetime, end_datetime) VALUES (?, ?, ?)', 
      [title, start_datetime, end_datetime]
    );
    res.status(201).json({ id: result.insertId, title, start_datetime, end_datetime });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear evento' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) return res.status(403).json({ error: 'Solo coordinadores' });
  const { title, start_datetime, end_datetime } = req.body;
  await db.execute('UPDATE events SET title = ?, start_datetime = ?, end_datetime = ? WHERE id = ?', 
    [title, start_datetime, end_datetime, req.params.id]);
  res.json({ message: 'Evento actualizado' });
});

router.delete('/:id', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) return res.status(403).json({ error: 'Solo coordinadores' });
  await db.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
  res.json({ message: 'Evento eliminado' });
});

module.exports = router;