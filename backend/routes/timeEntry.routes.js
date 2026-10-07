const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const multer = require('multer');

const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');


// ============================================================
// ATTACHMENTS CONFIGURATION
// ============================================================

const ATTACHMENTS_ROOT = path.resolve(
  process.env.TIME_ENTRY_UPLOAD_DIR ||
  path.join(__dirname, '../storage/time-entry-attachments')
);

fs.mkdirSync(ATTACHMENTS_ROOT, {
  recursive: true
});


// ============================================================
// ALLOWED ATTACHMENT TYPES
// ============================================================

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES_PER_UPLOAD = 10;


// ============================================================
// FILE HELPERS
// ============================================================

function getTimeEntryDirectory(timeEntryId) {
  return path.join(
    ATTACHMENTS_ROOT,
    String(timeEntryId)
  );
}


function getAttachmentPath(timeEntryId, storedName) {
  return path.join(
    getTimeEntryDirectory(timeEntryId),
    storedName
  );
}


/**
 * Original user filename is stored only as metadata.
 *
 * Removes path information and control characters.
 */
function normalizeOriginalName(originalName) {
  if (!originalName) {
    return 'archivo';
  }

  // Handle both Windows and Unix-style paths.
  let name = originalName.replace(/\\/g, '/');
  name = path.posix.basename(name);

  // Remove control characters.
  name = name.replace(/[\x00-\x1F\x7F]/g, '');

  name = name.trim();

  if (!name) {
    name = 'archivo';
  }

  // Leave room for database VARCHAR(255).
  if (name.length > 240) {
    name = name.substring(0, 240);
  }

  return name;
}


async function safeDeleteFile(filePath) {
  try {
    await fsp.unlink(filePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return;
    }

    console.error(
      'Could not delete attachment:',
      filePath,
      err
    );
  }
}


async function removeDirectoryIfEmpty(timeEntryId) {
  const directory = getTimeEntryDirectory(timeEntryId);

  try {
    const files = await fsp.readdir(directory);

    if (files.length === 0) {
      await fsp.rmdir(directory);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(
        'Could not remove attachment directory:',
        directory,
        err
      );
    }
  }
}


// ============================================================
// AUTHORIZATION HELPER FOR TIME ENTRY
// ============================================================

async function checkTimeEntryAccess(req, res, next) {
  try {
    const entryId =
      req.params.id ||
      req.params.entryId;

    let sql = `
      SELECT id, volunteer_id
      FROM time_entries
      WHERE id = ?
    `;

    const params = [entryId];

    if (!isCoordinator(req)) {
      sql += `
        AND volunteer_id = ?
      `;

      params.push(req.user.id);
    }

    const [rows] = await db.execute(
      sql,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Evento no encontrado o no autorizado'
      });
    }

    req.timeEntry = rows[0];

    next();

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
}


// ============================================================
// MULTER STORAGE
// ============================================================

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    const entryId = req.params.id;
    const directory =
      getTimeEntryDirectory(entryId);

    fs.mkdir(
      directory,
      { recursive: true },
      err => {

        if (err) {
          return cb(err);
        }

        cb(null, directory);
      }
    );
  },


  filename: (req, file, cb) => {

    const extension =
      ALLOWED_MIME_TYPES[file.mimetype];

    if (!extension) {
      return cb(
        new Error(
          'Tipo de archivo no permitido'
        )
      );
    }

    /*
     * The user's filename is NEVER used here.
     *
     * Example:
     *
     * User:
     *   photo.jpg
     *
     * Physical filename:
     *   742b7d6f-894a-45dd-a5e5-cabc9de2643d.jpg
     */

    const uniqueFilename =
      `${crypto.randomUUID()}${extension}`;

    cb(
      null,
      uniqueFilename
    );
  }
});


const multerUpload = multer({

  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_UPLOAD
  },

  fileFilter: (req, file, cb) => {

    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      return cb(
        new Error(
          `Tipo de archivo no permitido: ${file.mimetype}`
        )
      );
    }

    cb(null, true);
  }
});


// ============================================================
// MULTER WRAPPER / ERROR HANDLER
// ============================================================

function uploadAttachments(req, res, next) {

  multerUpload.array(
    'attachments',
    MAX_FILES_PER_UPLOAD
  )(req, res, async err => {

    if (!err) {
      return next();
    }

    /*
     * Multer could already have stored some files
     * before another file caused an error.
     *
     * Clean them up.
     */

    for (const file of req.files || []) {
      await safeDeleteFile(file.path);
    }

    await removeDirectoryIfEmpty(
      req.params.id
    );


    if (
      err instanceof multer.MulterError
    ) {

      if (
        err.code === 'LIMIT_FILE_SIZE'
      ) {
        return res.status(400).json({
          error: `Cada archivo puede tener como máximo ${MAX_FILE_SIZE / 1024 / 1024} MB`
        });
      }

      if (
        err.code === 'LIMIT_FILE_COUNT'
      ) {
        return res.status(400).json({
          error: `Solo se permiten ${MAX_FILES_PER_UPLOAD} archivos por subida`
        });
      }

      return res.status(400).json({
        error: err.message
      });
    }


    return res.status(400).json({
      error: err.message
    });
  });
}


// ============================================================
// COMMENTS HELPER
// ============================================================

async function insertComments(
  connection,
  timeEntryId,
  volunteerId,
  bodyData
) {

  let commentsToInsert = [];

  const rawComments =
    bodyData.comments ??
    bodyData.comment;


  if (Array.isArray(rawComments)) {

    commentsToInsert = rawComments
      .map(c => {

        if (typeof c === 'string') {
          return c;
        }

        if (
          c &&
          typeof c.comment === 'string'
        ) {
          return c.comment;
        }

        return '';
      })
      .filter(
        c =>
          typeof c === 'string' &&
          c.trim() !== ''
      );

  } else if (
    typeof rawComments === 'string'
  ) {

    if (rawComments.trim() !== '') {
      commentsToInsert.push(
        rawComments.trim()
      );
    }

  } else if (
    rawComments &&
    typeof rawComments === 'object' &&
    typeof rawComments.comment === 'string'
  ) {

    if (
      rawComments.comment.trim() !== ''
    ) {
      commentsToInsert.push(
        rawComments.comment.trim()
      );
    }
  }


  for (const text of commentsToInsert) {

    await connection.execute(
      `
      INSERT INTO time_entry_comments (
        time_entry_id,
        volunteer_id,
        comment
      )
      VALUES (?, ?, ?)
      `,
      [
        timeEntryId,
        volunteerId,
        text
      ]
    );
  }
}


// ============================================================
// GET TIME ENTRIES
// COMMENTS + ATTACHMENTS
// ============================================================

router.get(
  '/',
  requireAuth,
  async (req, res) => {

    try {

      let sql = `
        SELECT
          t.*,

          p.name AS patient_name,
          p.id AS patient_id,

          g.title AS title,

          v.full_name AS volunteer_name,
          v.email AS volunteer_email

        FROM time_entries t

        LEFT JOIN volunteers v
          ON t.volunteer_id = v.id

        LEFT JOIN patient_time_entries pte
          ON t.id = pte.time_entry_id

        LEFT JOIN patients p
          ON p.id = pte.patient_id

        LEFT JOIN general_time_entries g
          ON t.id = g.time_entry_id
      `;


      const params = [];


      if (!isCoordinator(req)) {

        sql += `
          WHERE t.volunteer_id = ?
        `;

        params.push(req.user.id);
      }


      sql += `
        ORDER BY t.start_datetime DESC
      `;


      const [rows] =
        await db.execute(
          sql,
          params
        );


      if (rows.length === 0) {
        return res.json([]);
      }


      const eventIds =
        rows.map(row => row.id);


      // ========================================================
      // COMMENTS
      // ========================================================

      const [commentsRows] =
        await db.query(
          `
          SELECT
            c.id,
            c.time_entry_id,
            c.comment,

            cv.full_name
              AS comment_author_name,

            c.created_at,
            c.updated_at

          FROM time_entry_comments c

          LEFT JOIN volunteers cv
            ON c.volunteer_id = cv.id

          WHERE c.time_entry_id IN (?)

          ORDER BY c.created_at DESC
          `,
          [eventIds]
        );


      const commentsMap = {};


      for (const comment of commentsRows) {

        if (
          !commentsMap[
          comment.time_entry_id
          ]
        ) {
          commentsMap[
            comment.time_entry_id
          ] = [];
        }

        commentsMap[
          comment.time_entry_id
        ].push(comment);
      }


      // ========================================================
      // ATTACHMENTS
      // ========================================================

      const [attachmentsRows] =
        await db.query(
          `
          SELECT
            a.id,
            a.time_entry_id,
            a.original_name,
            a.mime_type,
            a.file_size,
            a.created_at,

            av.full_name
              AS uploaded_by_name

          FROM time_entry_attachments a

          LEFT JOIN volunteers av
            ON a.uploaded_by = av.id

          WHERE a.time_entry_id IN (?)

          ORDER BY a.created_at DESC
          `,
          [eventIds]
        );


      const attachmentsMap = {};


      for (const attachment of attachmentsRows) {

        if (
          !attachmentsMap[
          attachment.time_entry_id
          ]
        ) {
          attachmentsMap[
            attachment.time_entry_id
          ] = [];
        }


        attachmentsMap[
          attachment.time_entry_id
        ].push({

          id:
            attachment.id,

          original_name:
            attachment.original_name,

          mime_type:
            attachment.mime_type,

          file_size:
            attachment.file_size,

          created_at:
            attachment.created_at,

          uploaded_by_name:
            attachment.uploaded_by_name,

          download_url:
            `/api/time-entries/${attachment.time_entry_id}/attachments/${attachment.id}`
        });
      }


      // ========================================================
      // MERGE EVERYTHING
      // ========================================================

      for (const row of rows) {

        row.comments =
          commentsMap[row.id] || [];

        row.attachments =
          attachmentsMap[row.id] || [];
      }


      res.json(rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: err.message
      });
    }
  }
);


// ============================================================
// CREATE EVENT
// ============================================================

router.post(
  '/',
  requireAuth,
  async (req, res) => {

    const {
      start_datetime,
      end_datetime,
      patient_id,
      title
    } = req.body;


    const connection =
      await db.getConnection();


    try {

      await connection.beginTransaction();


      const [result] =
        await connection.execute(
          `
          INSERT INTO time_entries (
            volunteer_id,
            start_datetime,
            end_datetime
          )
          VALUES (?, ?, ?)
          `,
          [
            req.user.id,
            start_datetime,
            end_datetime
          ]
        );


      const timeEntryId =
        result.insertId;


      await insertComments(
        connection,
        timeEntryId,
        req.user.id,
        req.body
      );


      if (patient_id) {

        await connection.execute(
          `
          INSERT INTO patient_time_entries (
            time_entry_id,
            patient_id
          )
          VALUES (?, ?)
          `,
          [
            timeEntryId,
            patient_id
          ]
        );

      } else if (title) {

        await connection.execute(
          `
          INSERT INTO general_time_entries (
            time_entry_id,
            title
          )
          VALUES (?, ?)
          `,
          [
            timeEntryId,
            title
          ]
        );
      }


      await connection.commit();


      res.status(201).json({
        id: timeEntryId
      });

    } catch (err) {

      await connection.rollback();

      console.error(err);

      res.status(500).json({
        error: err.message
      });

    } finally {

      connection.release();
    }
  }
);


// ============================================================
// UPDATE EVENT
// ============================================================

router.put(
  '/:id',
  requireAuth,
  async (req, res) => {

    const {
      start_datetime,
      end_datetime,
      patient_id,
      title
    } = req.body;


    const entryId =
      req.params.id;


    const connection =
      await db.getConnection();


    try {

      await connection.beginTransaction();


      let checkSql = `
        SELECT *
        FROM time_entries
        WHERE id = ?
      `;


      const checkParams = [
        entryId
      ];


      if (!isCoordinator(req)) {

        checkSql += `
          AND volunteer_id = ?
        `;

        checkParams.push(
          req.user.id
        );
      }


      const [existingRows] =
        await connection.execute(
          checkSql,
          checkParams
        );


      if (
        existingRows.length === 0
      ) {

        await connection.rollback();

        return res.status(404).json({
          error:
            'Evento no encontrado o no autorizado'
        });
      }


      await connection.execute(
        `
        UPDATE time_entries
        SET
          start_datetime = ?,
          end_datetime = ?
        WHERE id = ?
        `,
        [
          start_datetime,
          end_datetime,
          entryId
        ]
      );


      await insertComments(
        connection,
        entryId,
        req.user.id,
        req.body
      );


      const [oldPatientRows] =
        await connection.execute(
          `
          SELECT patient_id
          FROM patient_time_entries
          WHERE time_entry_id = ?
          `,
          [entryId]
        );


      const resolvedPatientId =
        patient_id ||
        (
          oldPatientRows.length > 0
            ? oldPatientRows[0].patient_id
            : null
        );


      await connection.execute(
        `
        DELETE FROM patient_time_entries
        WHERE time_entry_id = ?
        `,
        [entryId]
      );


      await connection.execute(
        `
        DELETE FROM general_time_entries
        WHERE time_entry_id = ?
        `,
        [entryId]
      );


      if (resolvedPatientId) {

        await connection.execute(
          `
          INSERT INTO patient_time_entries (
            time_entry_id,
            patient_id
          )
          VALUES (?, ?)
          `,
          [
            entryId,
            resolvedPatientId
          ]
        );

      } else if (title) {

        await connection.execute(
          `
          INSERT INTO general_time_entries (
            time_entry_id,
            title
          )
          VALUES (?, ?)
          `,
          [
            entryId,
            title
          ]
        );
      }


      await connection.commit();


      res.json({
        message: 'OK'
      });

    } catch (err) {

      await connection.rollback();

      console.error(err);

      res.status(500).json({
        error: err.message
      });

    } finally {

      connection.release();
    }
  }
);


// ============================================================
// UPLOAD ATTACHMENTS
//
// POST /api/time-entries/:id/attachments
//
// multipart/form-data
//
// Field:
// attachments
// ============================================================

router.post(
  '/:id/attachments',

  requireAuth,

  // Access is checked BEFORE accepting files.
  checkTimeEntryAccess,

  uploadAttachments,

  async (req, res) => {

    const entryId =
      req.params.id;

    const files =
      req.files || [];


    if (files.length === 0) {

      return res.status(400).json({
        error:
          'No se ha enviado ningún archivo'
      });
    }


    const connection =
      await db.getConnection();


    try {

      await connection.beginTransaction();


      const attachments = [];


      for (const file of files) {

        const originalName =
          normalizeOriginalName(
            file.originalname
          );


        const [result] =
          await connection.execute(
            `
            INSERT INTO time_entry_attachments (
              time_entry_id,
              uploaded_by,
              original_name,
              stored_name,
              mime_type,
              file_size
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              entryId,
              req.user.id,
              originalName,
              file.filename,
              file.mimetype,
              file.size
            ]
          );


        attachments.push({

          id:
            result.insertId,

          original_name:
            originalName,

          mime_type:
            file.mimetype,

          file_size:
            file.size,

          download_url:
            `/api/time-entries/${entryId}/attachments/${result.insertId}`
        });
      }


      await connection.commit();


      res.status(201).json({
        attachments
      });

    } catch (err) {

      await connection.rollback();


      /*
       * Database failed after Multer saved files.
       *
       * Remove those physical files.
       */

      for (const file of files) {
        await safeDeleteFile(
          file.path
        );
      }


      await removeDirectoryIfEmpty(
        entryId
      );


      console.error(err);


      res.status(500).json({
        error: err.message
      });

    } finally {

      connection.release();
    }
  }
);


// ============================================================
// DOWNLOAD ATTACHMENT
//
// GET
// /api/time-entries/:entryId/attachments/:attachmentId
// ============================================================

router.get(
  '/:entryId/attachments/:attachmentId',

  requireAuth,

  async (req, res) => {

    try {

      const {
        entryId,
        attachmentId
      } = req.params;


      let sql = `
        SELECT
          a.id,
          a.time_entry_id,
          a.original_name,
          a.stored_name,
          a.mime_type,
          a.file_size,

          t.volunteer_id

        FROM time_entry_attachments a

        INNER JOIN time_entries t
          ON t.id = a.time_entry_id

        WHERE
          a.id = ?
          AND
          a.time_entry_id = ?
      `;


      const params = [
        attachmentId,
        entryId
      ];


      if (!isCoordinator(req)) {

        sql += `
          AND t.volunteer_id = ?
        `;

        params.push(
          req.user.id
        );
      }


      const [rows] =
        await db.execute(
          sql,
          params
        );


      if (rows.length === 0) {

        return res.status(404).json({
          error:
            'Archivo no encontrado o no autorizado'
        });
      }


      const attachment =
        rows[0];


      const filePath =
        getAttachmentPath(
          attachment.time_entry_id,
          attachment.stored_name
        );


      try {

        await fsp.access(
          filePath,
          fs.constants.R_OK
        );

      } catch {

        console.error(
          'Attachment exists in DB but not filesystem:',
          filePath
        );


        return res.status(404).json({
          error:
            'El archivo físico no existe'
        });
      }


      res.setHeader(
        'Content-Type',
        attachment.mime_type
      );


      /*
       * User downloads using original filename.
       *
       * UUID physical filename remains hidden.
       */

      res.download(
        filePath,
        attachment.original_name
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: err.message
      });
    }
  }
);


// ============================================================
// DELETE ONE ATTACHMENT
//
// DELETE
// /api/time-entries/:entryId/attachments/:attachmentId
// ============================================================

router.delete(
  '/:entryId/attachments/:attachmentId',

  requireAuth,

  async (req, res) => {

    const connection =
      await db.getConnection();


    try {

      const {
        entryId,
        attachmentId
      } = req.params;


      let sql = `
        SELECT
          a.id,
          a.time_entry_id,
          a.stored_name,

          t.volunteer_id

        FROM time_entry_attachments a

        INNER JOIN time_entries t
          ON t.id = a.time_entry_id

        WHERE
          a.id = ?
          AND
          a.time_entry_id = ?
      `;


      const params = [
        attachmentId,
        entryId
      ];


      if (!isCoordinator(req)) {

        sql += `
          AND t.volunteer_id = ?
        `;

        params.push(
          req.user.id
        );
      }


      const [rows] =
        await connection.execute(
          sql,
          params
        );


      if (rows.length === 0) {

        return res.status(404).json({
          error:
            'Archivo no encontrado o no autorizado'
        });
      }


      const attachment =
        rows[0];


      await connection.execute(
        `
        DELETE FROM time_entry_attachments
        WHERE id = ?
        `,
        [attachmentId]
      );


      const filePath =
        getAttachmentPath(
          attachment.time_entry_id,
          attachment.stored_name
        );


      await safeDeleteFile(
        filePath
      );


      await removeDirectoryIfEmpty(
        attachment.time_entry_id
      );


      res.json({
        message: 'OK'
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: err.message
      });

    } finally {

      connection.release();
    }
  }
);


// ============================================================
// DELETE COMPLETE EVENT
// Also removes physical attachment files.
// ============================================================

router.delete(
  '/:id',

  requireAuth,

  async (req, res) => {

    const connection =
      await db.getConnection();


    try {

      await connection.beginTransaction();


      const entryId =
        req.params.id;


      let checkSql = `
        SELECT id
        FROM time_entries
        WHERE id = ?
      `;


      const checkParams = [
        entryId
      ];


      if (!isCoordinator(req)) {

        checkSql += `
          AND volunteer_id = ?
        `;

        checkParams.push(
          req.user.id
        );
      }


      const [entryRows] =
        await connection.execute(
          checkSql,
          checkParams
        );


      if (entryRows.length === 0) {

        await connection.rollback();

        return res.status(404).json({
          error:
            'Evento no encontrado o no autorizado'
        });
      }


      /*
       * Read physical filenames BEFORE DB cascade
       * deletes the attachment records.
       */

      const [attachments] =
        await connection.execute(
          `
          SELECT stored_name
          FROM time_entry_attachments
          WHERE time_entry_id = ?
          `,
          [entryId]
        );


      /*
       * ON DELETE CASCADE removes:
       *
       * time_entry_comments
       * time_entry_attachments
       * patient_time_entries
       * general_time_entries
       */

      await connection.execute(
        `
        DELETE FROM time_entries
        WHERE id = ?
        `,
        [entryId]
      );


      await connection.commit();


      /*
       * Database is now committed.
       * Remove physical files.
       */

      for (const attachment of attachments) {

        const filePath =
          getAttachmentPath(
            entryId,
            attachment.stored_name
          );


        await safeDeleteFile(
          filePath
        );
      }


      await removeDirectoryIfEmpty(
        entryId
      );


      res.json({
        message: 'OK'
      });

    } catch (err) {

      await connection.rollback();

      console.error(err);

      res.status(500).json({
        error: err.message
      });

    } finally {

      connection.release();
    }
  }
);


module.exports = router;