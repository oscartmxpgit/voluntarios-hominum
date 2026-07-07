const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

// =======================================
// GET ALL PATIENTS (Admin/Coordinator)
// =======================================
router.get('/', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores' });
  }

  try {
    const query = `
      SELECT
        p.*,
        u.email AS volunteer_email
      FROM patients p
      LEFT JOIN volunteers u
        ON p.assigned_volunteer_id = u.id
      ORDER BY p.name ASC
    `;

    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =======================================
// CREATE PATIENT
// =======================================
router.post('/', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores' });
  }

  const { name, assigned_volunteer_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO patients (name, assigned_volunteer_id)
       VALUES (?, ?)`,
      [name, assigned_volunteer_id || null]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      assigned_volunteer_id: assigned_volunteer_id || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =======================================
// UPDATE PATIENT
// =======================================
router.put('/:id', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores' });
  }

  const { id } = req.params;
  const { name, assigned_volunteer_id, status } = req.body;

  try {
    await db.execute(
      `UPDATE patients
       SET
          name = ?,
          assigned_volunteer_id = ?,
          status = ?
       WHERE id = ?`,
      [
        name,
        assigned_volunteer_id || null,
        status || 'active',
        id
      ]
    );

    res.json({ message: 'Paciente actualizado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =======================================
// DELETE PATIENT
// =======================================
router.delete('/:id', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores' });
  }

  const { id } = req.params;

  try {
    await db.execute(
      'DELETE FROM patients WHERE id = ?',
      [id]
    );

    res.json({ message: 'Paciente eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =======================================
// AVAILABLE PATIENTS (Filtered by User)
// =======================================
router.get('/available', requireAuth, async (req, res) => {
  try {
    let sql = `
      SELECT
        id,
        name
      FROM patients
      WHERE status = 'active'
    `;

    const params = [];

    // Filter by volunteer if not a coordinator
    if (!isCoordinator(req)) {
      sql += ` AND assigned_volunteer_id = ? `;
      params.push(req.user.id);
    }

    sql += ` ORDER BY name `;

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// =======================================
// GET PATIENTS BY VOLUNTEER (Helper for specific email filtering)
// =======================================
router.get('/by-volunteer/:volunteerId', requireAuth, async (req, res) => {
  const { volunteerId } = req.params;

  // Security check: Only allow if it's the user's own ID or if they are a coordinator
  if (!isCoordinator(req) && String(req.user.id) !== String(volunteerId)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  try {
    const sql = `
      SELECT id, name 
      FROM patients 
      WHERE assigned_volunteer_id = ? AND status = 'active'
      ORDER BY name ASC
    `;

    const [rows] = await db.execute(sql, [volunteerId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;