const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

// Obtener todos los pacientes
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
      LEFT JOIN users u
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

// Crear un paciente
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

// Actualizar un paciente
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

// Eliminar un paciente
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

module.exports = router;