const express = require('express');
const router = express.Router();

const db = require('../config/db');
const {
  requireAuth,
  isCoordinator
} = require('../middleware/auth');

const volunteerFields = `
  id,
  email,
  full_name,
  residencia,
  is_coordinator,
  is_active
`;

function coordinatorOnly(req, res, next) {
  if (!isCoordinator(req)) {
    return res.status(403).json({
      error: 'Solo coordinadores'
    });
  }

  next();
}

function validId(id) {
  return /^[1-9]\d*$/.test(id) &&
    Number.isSafeInteger(Number(id));
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

// 1. Usuario autenticado
router.get('/me', requireAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Usuario no autenticado'
    });
  }

  res.json(req.user);
});

// 2. Comprobar si es coordinador
router.get('/check-role', requireAuth, (req, res) => {
  res.json({
    isCoordinator: isCoordinator(req)
  });
});

// 3. Obtener todos los usuarios
router.get(
  '/',
  requireAuth,
  coordinatorOnly,
  async (req, res) => {
    try {
      const [rows] = await db.execute(
        `SELECT ${volunteerFields}
         FROM volunteers
         ORDER BY full_name ASC, email ASC`
      );

      res.json(rows);
    } catch (err) {
      console.error('ERROR EN GET / (volunteers):', err);

      res.status(500).json({
        error: 'No se pudo obtener el listado de voluntarios'
      });
    }
  }
);

// 4. Obtener usuarios activos
router.get(
  '/volunteers',
  requireAuth,
  coordinatorOnly,
  async (req, res) => {
    try {
      const [rows] = await db.execute(
        `SELECT ${volunteerFields}
         FROM volunteers
         WHERE is_active = 1
         ORDER BY full_name ASC, email ASC`
      );

      res.json(rows);
    } catch (err) {
      console.error('ERROR EN GET /volunteers:', err);

      res.status(500).json({
        error: 'No se pudieron obtener los voluntarios activos'
      });
    }
  }
);

// 5. Actualizar datos personales o estado
router.patch(
  '/:id',
  requireAuth,
  coordinatorOnly,
  async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    if (!validId(id)) {
      return res.status(400).json({
        error: 'El ID del voluntario no es válido'
      });
    }

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return res.status(400).json({
        error: 'El cuerpo de la petición debe ser un objeto'
      });
    }

    const allowedFields = [
      'email',
      'full_name',
      'residencia',
      'is_active'
    ];

    const keys = Object.keys(body);

    if (keys.length === 0) {
      return res.status(400).json({
        error: 'No se han proporcionado campos para actualizar'
      });
    }

    if (keys.some(key => !allowedFields.includes(key))) {
      return res.status(400).json({
        error: 'La petición contiene campos no editables'
      });
    }

    const changes = {};

    if (hasOwn(body, 'email')) {
      if (typeof body.email !== 'string') {
        return res.status(400).json({
          error: 'El email debe ser un texto'
        });
      }

      const email = body.email.trim();

      if (
        email.length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return res.status(400).json({
          error: 'Introduce un email válido de hasta 255 caracteres'
        });
      }

      changes.email = email;
    }

    for (const field of ['full_name', 'residencia']) {
      if (!hasOwn(body, field)) continue;

      const value = body[field];

      if (value !== null && typeof value !== 'string') {
        return res.status(400).json({
          error: `${field} debe ser un texto o null`
        });
      }

      const normalized = value === null
        ? null
        : value.trim();

      if (
        normalized !== null &&
        normalized.length > 255
      ) {
        return res.status(400).json({
          error: `${field} no puede superar los 255 caracteres`
        });
      }

      changes[field] = normalized || null;
    }

    const changesStatus = hasOwn(body, 'is_active');

    if (changesStatus) {
      if (body.is_active !== 0 && body.is_active !== 1) {
        return res.status(400).json({
          error: 'El parámetro is_active debe ser 0 o 1'
        });
      }

      changes.is_active = body.is_active;
    }

    try {
      const [userRows] = await db.execute(
        'SELECT is_coordinator FROM volunteers WHERE id = ?',
        [id]
      );

      if (userRows.length === 0) {
        return res.status(404).json({
          error: 'Usuario no encontrado'
        });
      }

      // Los coordinadores pueden editarse, pero no desactivarse.
      if (
        changesStatus &&
        Number(userRows[0].is_coordinator) === 1
      ) {
        return res.status(400).json({
          error: 'No se puede cambiar el estado de un coordinador'
        });
      }

      // Los campos están restringidos a allowedFields.
      const fields = Object.keys(changes);
      const assignments = fields
        .map(field => `\`${field}\` = ?`)
        .join(', ');

      const values = fields.map(field => changes[field]);

      // Protege también si el rol cambia durante la petición.
      const statusGuard = changesStatus
        ? ' AND is_coordinator = 0'
        : '';

      await db.execute(
        `UPDATE volunteers
         SET ${assignments}
         WHERE id = ?${statusGuard}`,
        [...values, id]
      );

      const [updatedRows] = await db.execute(
        `SELECT ${volunteerFields}
         FROM volunteers
         WHERE id = ?`,
        [id]
      );

      if (updatedRows.length === 0) {
        return res.status(404).json({
          error: 'Usuario no encontrado'
        });
      }

      if (
        changesStatus &&
        Number(updatedRows[0].is_coordinator) === 1
      ) {
        return res.status(409).json({
          error: 'El usuario ahora es coordinador. Recarga el listado.'
        });
      }

      res.json({
        message: 'Voluntario actualizado correctamente',
        volunteer: updatedRows[0]
      });
    } catch (err) {
      console.error(`ERROR EN PATCH /${id}:`, err);

      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'Ya existe un voluntario con ese email'
        });
      }

      res.status(500).json({
        error: 'No se pudo actualizar el voluntario'
      });
    }
  }
);

// 6. Eliminar usuario
router.delete(
  '/:id',
  requireAuth,
  coordinatorOnly,
  async (req, res) => {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        error: 'El ID del voluntario no es válido'
      });
    }

    try {
      const [result] = await db.execute(
        `DELETE FROM volunteers
         WHERE id = ? AND is_coordinator = 0`,
        [id]
      );

      if (result.affectedRows === 0) {
        const [rows] = await db.execute(
          'SELECT id FROM volunteers WHERE id = ?',
          [id]
        );

        if (rows.length === 0) {
          return res.status(404).json({
            error: 'Usuario no encontrado'
          });
        }

        return res.status(400).json({
          error: 'No se puede eliminar a un coordinador'
        });
      }

      res.json({
        message: 'Usuario eliminado correctamente'
      });
    } catch (err) {
      console.error(`ERROR EN DELETE /${id}:`, err);

      res.status(500).json({
        error: 'No se pudo eliminar el voluntario'
      });
    }
  }
);

module.exports = router;