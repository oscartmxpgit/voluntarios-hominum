const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

// 1. Usuario autenticado
router.get('/me', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      console.error("DEBUG: /me falló porque req.user es null/undefined");
      return res.status(401).json({ error: "Usuario no autenticado" });
    }
    res.json(req.user);
  } catch (err) {
    console.error("ERROR CRÍTICO EN /me:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Comprobar si es coordinador
router.get('/check-role', requireAuth, (req, res) => {
  try {
    res.json({ isCoordinator: isCoordinator(req) });
  } catch (err) {
    console.error("ERROR EN /check-role:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Obtener todos los usuarios (solo coordinadores)
router.get('/', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, email, is_coordinator, is_active FROM volunteers ORDER BY email ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error("ERROR EN GET / (volunteers):", err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Obtener solo voluntarios activos
router.get('/volunteers', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, email, is_active FROM volunteers WHERE is_active = 1 ORDER BY email ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error("ERROR EN GET /volunteers:", err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Actualizar estado
router.patch('/:id', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores pueden editar' });
  }

  const { id } = req.params;
  const { is_active } = req.body;

  if (is_active === undefined || (is_active !== 0 && is_active !== 1)) {
    return res.status(400).json({ error: 'El parámetro is_active debe ser 0 o 1' });
  }

  try {
    const [userRows] = await db.execute('SELECT is_coordinator FROM volunteers WHERE id = ?', [id]);
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (Number(userRows[0].is_coordinator) === 1) {
      return res.status(400).json({ error: 'No se puede cambiar el estado de un coordinador' });
    }

    await db.execute(
      'UPDATE volunteers SET is_active = ? WHERE id = ?',
      [is_active, id]
    );

    res.json({ message: 'Estado actualizado correctamente', id, is_active });
  } catch (err) {
    console.error(`ERROR EN PATCH /${id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Eliminar usuario
router.delete('/:id', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores' });
  }

  const { id } = req.params;

  try {
    await db.execute('DELETE FROM volunteers WHERE id = ? AND is_coordinator = 0', [id]);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error(`ERROR EN DELETE /${id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;