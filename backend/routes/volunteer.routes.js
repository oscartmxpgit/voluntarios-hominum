const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

// 1. Usuario autenticado
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// 2. Comprobar si es coordinador
router.get('/check-role', requireAuth, (req, res) => {
  res.json({ isCoordinator: isCoordinator(req) });
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
    res.status(500).json({ error: err.message });
  }
});

// 4. Obtener solo voluntarios activos (para el selector)
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
    res.status(500).json({ error: err.message });
  }
});

// 5. NUEVO: Actualizar el estado de activación (is_active) de un voluntario
router.patch('/:id', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores pueden editar usuarios' });
  }

  const { id } = req.params;
  const { is_active } = req.body;

  // Validación rápida del parámetro recibido
  if (is_active === undefined || (is_active !== 0 && is_active !== 1)) {
    return res.status(400).json({ error: 'El parámetro is_active debe ser 0 o 1' });
  }

  try {
    // Protección de seguridad extra: Evitamos que se pueda desactivar a un coordinador indirectamente
    const [userRows] = await db.execute('SELECT is_coordinator FROM volunteers WHERE id = ?', [id]);
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (Number(userRows[0].is_coordinator) === 1) {
      return res.status(400).json({ error: 'No se puede cambiar el estado de un coordinador' });
    }

    // Ejecutamos la actualización en la BD
    await db.execute(
      'UPDATE volunteers SET is_active = ? WHERE id = ?',
      [is_active, id]
    );

    res.json({ message: 'Estado actualizado correctamente', id, is_active });
  } catch (err) {
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;