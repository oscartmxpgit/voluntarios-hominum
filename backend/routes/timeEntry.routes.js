const express = require('express');
const router = express.Router();

const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

// Función auxiliar interna para insertar comentarios (soporta strings o arrays)
// Función auxiliar interna para insertar comentarios de forma totalmente segura
async function insertComments(connection, timeEntryId, volunteerId, bodyData) {
  let commentsToInsert = [];

  const rawComments = bodyData.comments ?? bodyData.comment;

  if (Array.isArray(rawComments)) {
    commentsToInsert = rawComments
      .map(c => {
        if (typeof c === 'string') return c;
        if (c && typeof c.comment === 'string') return c.comment;
        return '';
      })
      .filter(c => typeof c === 'string' && c.trim() !== '');
  } else if (typeof rawComments === 'string') {
    if (rawComments.trim() !== '') {
      commentsToInsert.push(rawComments.trim());
    }
  } else if (rawComments && typeof rawComments === 'object' && typeof rawComments.comment === 'string') {
    if (rawComments.comment.trim() !== '') {
      commentsToInsert.push(rawComments.comment.trim());
    }
  }

  for (const text of commentsToInsert) {
    await connection.execute(
      `INSERT INTO time_entry_comments (time_entry_id, volunteer_id, comment) VALUES (?, ?, ?)`,
      [timeEntryId, volunteerId, text]
    );
  }
}

// =======================================
// OBTENER EVENTOS (Con historial completo de comentarios)
// =======================================
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = `
      SELECT t.*, 
             p.name AS patient_name, 
             p.id AS patient_id,
             g.title AS title,
             v.full_name AS volunteer_name,
             v.email AS volunteer_email
      FROM time_entries t
      LEFT JOIN volunteers v ON t.volunteer_id = v.id
      LEFT JOIN patient_time_entries pte ON t.id = pte.time_entry_id
      LEFT JOIN patients p ON p.id = pte.patient_id
      LEFT JOIN general_time_entries g ON t.id = g.time_entry_id
    `;

    const params = [];
    
    if (!isCoordinator(req)) {
      sql += ` WHERE t.volunteer_id = ?`;
      params.push(req.user.id);
    }

    sql += ` ORDER BY t.start_datetime DESC`;

    const [rows] = await db.execute(sql, params);

    if (rows.length > 0) {
      const eventIds = rows.map(r => r.id);
      
      const [commentsRows] = await db.query(
        `SELECT c.id,
                c.time_entry_id,
                c.comment,
                cv.full_name AS comment_author_name,
                c.created_at
         FROM time_entry_comments c
         LEFT JOIN volunteers cv ON c.volunteer_id = cv.id
         WHERE c.time_entry_id IN (?)
         ORDER BY c.created_at DESC`,
        [eventIds]
      );

      const commentsMap = {};
      for (const comment of commentsRows) {
        if (!commentsMap[comment.time_entry_id]) {
          commentsMap[comment.time_entry_id] = [];
        }
        commentsMap[comment.time_entry_id].push(comment);
      }

      for (const row of rows) {
        row.comments = commentsMap[row.id] || [];
      }
    }

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
  const { start_datetime, end_datetime, patient_id, title } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO time_entries (volunteer_id, start_datetime, end_datetime) VALUES (?, ?, ?)`,
      [req.user.id, start_datetime, end_datetime]
    );

    const timeEntryId = result.insertId;

    // Insertar comentarios (soporta uno o varios)
    await insertComments(connection, timeEntryId, req.user.id, req.body);

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
  const { start_datetime, end_datetime, patient_id, title } = req.body;
  const entryId = req.params.id;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

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

    await connection.execute(
      `UPDATE time_entries SET start_datetime = ?, end_datetime = ? WHERE id = ?`,
      [start_datetime, end_datetime, entryId]
    );

    // Insertar nuevos comentarios sin borrar los anteriores
    await insertComments(connection, entryId, req.user.id, req.body);

    const [oldPatientRows] = await connection.execute(
      `SELECT patient_id FROM patient_time_entries WHERE time_entry_id = ?`,
      [entryId]
    );
    
    const resolvedPatientId = patient_id || (oldPatientRows.length > 0 ? oldPatientRows[0].patient_id : null);

    await connection.execute(`DELETE FROM patient_time_entries WHERE time_entry_id = ?`, [entryId]);
    await connection.execute(`DELETE FROM general_time_entries WHERE time_entry_id = ?`, [entryId]);

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