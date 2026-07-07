const express = require('express');
const router = express.Router();

const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

// =======================================
// OBTENER EVENTOS
// =======================================
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = `
      SELECT
        t.*,
        p.name AS patient_name
      FROM time_entries t
      LEFT JOIN patients p
        ON p.id = t.patient_id
    `;

    const params = [];

    if (!isCoordinator(req)) {
      sql += ` WHERE t.volunteer_id = ?`;
      params.push(req.user.id);
    }

    sql += ` ORDER BY t.start_datetime DESC`;

    const [rows] = await db.execute(sql, params);

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// =======================================
// SOLO MIS EVENTOS
// =======================================
router.get('/mine', requireAuth, async (req, res) => {
  try {

    const [rows] = await db.execute(
      `
      SELECT
        t.*,
        p.name AS patient_name
      FROM time_entries t
      LEFT JOIN patients p
        ON p.id = t.patient_id
      WHERE t.volunteer_id = ?
      ORDER BY t.start_datetime DESC
      `,
      [req.user.id]
    );

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// =======================================
// CREAR
// =======================================
router.post('/', requireAuth, async (req, res) => {
  try {

    const {
      start_datetime,
      end_datetime,
      patient_id,
      comments
    } = req.body;

    const [result] = await db.execute(
      `
      INSERT INTO time_entries
      (
        volunteer_id,
        patient_id,
        start_datetime,
        end_datetime,
        comments
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        patient_id ?? null,
        start_datetime,
        end_datetime,
        comments ?? null
      ]
    );

    res.status(201).json({
      id: result.insertId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message
    });
  }
});

// =======================================
// ACTUALIZAR
// =======================================
router.put('/:id', requireAuth, async (req, res) => {
  try {

    const {
      start_datetime,
      end_datetime,
      patient_id,
      comments
    } = req.body;

    let sql = `
      UPDATE time_entries
      SET
        start_datetime = ?,
        end_datetime = ?,
        patient_id = ?,
        comments = ?
      WHERE id = ?
    `;

    const params = [
      start_datetime,
      end_datetime,
      patient_id ?? null,
      comments ?? null,
      req.params.id
    ];

    if (!isCoordinator(req)) {
      sql += ` AND volunteer_id = ?`;
      params.push(req.user.id);
    }

    const [result] = await db.execute(sql, params);

    if (!result.affectedRows) {
      return res.status(404).json({
        error: 'Evento no encontrado o no autorizado'
      });
    }

    res.json({
      message: 'OK'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message
    });
  }
});

// =======================================
// ELIMINAR
// =======================================
router.delete('/:id', requireAuth, async (req, res) => {
  try {

    let sql = `
      DELETE FROM time_entries
      WHERE id = ?
    `;

    const params = [req.params.id];

    if (!isCoordinator(req)) {
      sql += ` AND volunteer_id = ?`;
      params.push(req.user.id);
    }

    const [result] = await db.execute(sql, params);

    if (!result.affectedRows) {
      return res.status(404).json({
        error: 'Evento no encontrado o no autorizado'
      });
    }

    res.json({
      message: 'OK'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;