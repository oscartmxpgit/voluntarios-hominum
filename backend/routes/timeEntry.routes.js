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
      SELECT t.*, 
             p.name AS patient_name, 
             p.id AS patient_id,
             g.title AS title
      FROM time_entries t
      LEFT JOIN patient_time_entries pte ON t.id = pte.time_entry_id
      LEFT JOIN patients p ON p.id = pte.patient_id
      LEFT JOIN general_time_entries g ON t.id = g.time_entry_id
    `;

    const params = [];
    
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

    const [result] = await connection.execute(
      `INSERT INTO time_entries (volunteer_id, start_datetime, end_datetime, comments) VALUES (?, ?, ?, ?)`,
      [req.user.id, start_datetime, end_datetime, comments ?? null]
    );

    const timeEntryId = result.insertId;

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
  const entryId = req.params.id;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verificar si el evento existe y pertenece al usuario (si no es coordinador)
    let checkSql = `SELECT * FROM time_entries WHERE id = ?`;
    const checkParams = [entryId];

    if (!isCoordinator(req)) {
      checkSql += ` AND volunteer_id = ?`;
      checkParams.push(req.user.id);
    }

    const [existingRows] = await connection.execute(checkSql, checkParams);
    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Evento no encontrado o no autorizado' });
    }

    // 2. Actualizar tabla base
    await connection.execute(
      `UPDATE time_entries SET start_datetime = ?, end_datetime = ?, comments = ? WHERE id = ?`,
      [start_datetime, end_datetime, comments ?? null, entryId]
    );

    // 3. Inspeccionar relaciones existentes antes de borrar, por si el frontend no mandó el patient_id explícito
    const [oldPatientRows] = await connection.execute(
      `SELECT patient_id FROM patient_time_entries WHERE time_entry_id = ?`,
      [entryId]
    );
    
    // Si el body no trae patient_id pero la base de datos ya lo tenía asociado, lo conservamos
    const resolvedPatientId = patient_id || (oldPatientRows.length > 0 ? oldPatientRows[0].patient_id : null);

    // 4. Limpiar tablas específicas
    await connection.execute(`DELETE FROM patient_time_entries WHERE time_entry_id = ?`, [entryId]);
    await connection.execute(`DELETE FROM general_time_entries WHERE time_entry_id = ?`, [entryId]);

    // 5. Reinsertar en la tabla que corresponda de forma robusta
    if (resolvedPatientId) {
      await connection.execute(
        `INSERT INTO patient_time_entries (time_entry_id, patient_id) VALUES (?, ?)`,
        [entryId, resolvedPatientId]
      );
    } else if (title) {
      await connection.execute(
        `INSERT INTO general_time_entries (time_entry_id, title) VALUES (?, ?)`,
        [entryId, title]
      );
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