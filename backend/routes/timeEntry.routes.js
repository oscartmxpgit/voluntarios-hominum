const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  let sql = 'SELECT * FROM time_entries';
  const params = [];
  if (!isCoordinator(req)) { sql += ' WHERE volunteer_email = ?'; params.push(req.user.email); }
  sql += ' ORDER BY start_datetime DESC';
  const [rows] = await db.execute(sql, params);
  res.json(rows);
});

router.get('/mine', requireAuth, async (req, res) => {
  const [rows] = await db.execute(
    `SELECT *
     FROM time_entries
     WHERE volunteer_email = ?
     ORDER BY start_datetime DESC`,
    [req.user.email]
  );

  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { task_name, start_datetime, end_datetime, patient_name, comments } = req.body;
  const [result] = await db.execute(
    'INSERT INTO time_entries (volunteer_email, task_name, start_datetime, end_datetime, patient_name, comments) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.email, task_name, start_datetime, end_datetime, patient_name, comments]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { task_name, start_datetime, end_datetime, patient_name, comments } = req.body;
  let sql = 'UPDATE time_entries SET task_name=?, start_datetime=?, end_datetime=?, patient_name=?, comments=? WHERE id=?';
  const params = [task_name, start_datetime, end_datetime, patient_name, comments, req.params.id];
  if (!isCoordinator(req)) { sql += ' AND volunteer_email = ?'; params.push(req.user.email); }
  const [result] = await db.execute(sql, params);
  result.affectedRows === 0 ? res.status(404).json({ error: 'No autorizado' }) : res.json({ message: 'OK' });
});

router.delete('/:id', requireAuth, async (req, res) => {
  let sql = 'DELETE FROM time_entries WHERE id=?';
  const params = [req.params.id];
  if (!isCoordinator(req)) { sql += ' AND volunteer_email = ?'; params.push(req.user.email); }
  const [result] = await db.execute(sql, params);
  result.affectedRows === 0 ? res.status(404).json({ error: 'No autorizado' }) : res.json({ message: 'OK' });
});

module.exports = router;