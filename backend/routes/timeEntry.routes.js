const express = require('express');
const router = express.Router();

const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

// =======================================
// OBTENER EVENTOS
// =======================================
// OBTENER EVENTOS (Actualizado para soportar scope=all)
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = `
      SELECT t.*, 
             p.name AS patient_name, 
             g.title AS title
      FROM time_entries t
      LEFT JOIN patient_time_entries pte ON t.id = pte.time_entry_id
      LEFT JOIN patients p ON p.id = pte.patient_id
      LEFT JOIN general_time_entries g ON t.id = g.time_entry_id
    `;

    const params = [];
    
    // LÓGICA DE FILTRADO:
    // Si no es coordinador O si pide scope=all pero no es coordinador, forzamos su ID.
    // Solo si ES COORDINADOR y pide scope=all, omitimos el filtro.
    const esCoordinador = isCoordinator(req);
    const quiereGlobal = req.query.scope === 'all';

    if (!esCoordinador || !quiereGlobal) {
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
// CREAR EVENTO (Transaccional)
// =======================================
router.post('/', requireAuth, async (req, res) => {
  const { start_datetime, end_datetime, comments, patient_id, title } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insertar en tabla base
    const [result] = await connection.execute(
      `INSERT INTO time_entries (volunteer_id, start_datetime, end_datetime, comments) VALUES (?, ?, ?, ?)`,
      [req.user.id, start_datetime, end_datetime, comments ?? null]
    );

    const timeEntryId = result.insertId;

    // 2. Insertar en tabla específica según tipo
    if (patient_id) {
      await connection.execute(
        `INSERT INTO patient_time_entries (time_entry_id, patient_id) VALUES (?, ?)`,
        [timeEntryId, patient_id]
      );
    } else if (title) {
      await connection.execute(
        `INSERT INTO general_time_entries (time_entry_id, title) VALUES (?, ?)`,
        [timeEntryId, title]
      );
    }

    await connection.commit();
    res.status(201).json({ id: timeEntryId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// =======================================
// ACTUALIZAR EVENTO
// =======================================
router.put('/:id', requireAuth, async (req, res) => {
  const { start_datetime, end_datetime, comments, patient_id, title } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Actualizar tabla base
    let sql = `UPDATE time_entries SET start_datetime = ?, end_datetime = ?, comments = ? WHERE id = ?`;
    const params = [start_datetime, end_datetime, comments ?? null, req.params.id];

    if (!isCoordinator(req)) {
      sql += ` AND volunteer_id = ?`;
      params.push(req.user.id);
    }

    const [result] = await connection.execute(sql, params);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Evento no encontrado o no autorizado' });
    }

    // Actualizar/Sincronizar tablas específicas (DELETE/INSERT simple para consistencia)
    await connection.execute(`DELETE FROM patient_time_entries WHERE time_entry_id = ?`, [req.params.id]);
    await connection.execute(`DELETE FROM general_time_entries WHERE time_entry_id = ?`, [req.params.id]);

    if (patient_id) {
      await connection.execute(`INSERT INTO patient_time_entries (time_entry_id, patient_id) VALUES (?, ?)`, [req.params.id, patient_id]);
    } else if (title) {
      await connection.execute(`INSERT INTO general_time_entries (time_entry_id, title) VALUES (?, ?)`, [req.params.id, title]);
    }

    await connection.commit();
    res.json({ message: 'OK' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// =======================================
// ELIMINAR
// =======================================
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    let sql = `DELETE FROM time_entries WHERE id = ?`;
    const params = [req.params.id];

    if (!isCoordinator(req)) {
      sql += ` AND volunteer_id = ?`;
      params.push(req.user.id);
    }

    const [result] = await db.execute(sql, params);

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Evento no encontrado o no autorizado' });
    }

    res.json({ message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;