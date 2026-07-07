const db = require('../config/db');
const { getAuth } = require('@clerk/express');

const requireAuth = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const [rows] = await db.execute(
      'SELECT id, email, is_coordinator FROM volunteers WHERE clerk_user_id = ?',
      [userId]
    );

    if (!rows.length) return res.status(403).json({ error: 'Usuario no registrado' });

    const user = rows[0];
    req.user = {
      id: user.id,
      email: user.email,
      is_coordinator: Number(user.is_coordinator) === 1
    };
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error interno auth' });
  }
};

const isCoordinator = (req) => req.user?.is_coordinator === true;

module.exports = { requireAuth, isCoordinator };