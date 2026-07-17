const { getAuth } = require('@clerk/express');
const db = require('../config/db');

const requireAuth = async (req, res, next) => {
  try {
    // getAuth(req) extrae los datos de la sesión que el middleware inyectó
    const { userId } = getAuth(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'No autorizado: Token inválido o inexistente' });
    }

    // Buscamos el usuario en tu base de datos
    const [rows] = await db.execute(
      'SELECT id, email, is_coordinator, is_active FROM volunteers WHERE clerk_user_id = ?',
      [userId]
    );

    if (!rows.length) {
      return res.status(403).json({ error: 'Usuario no registrado en la base de datos' });
    }

    const user = rows[0];
    
    // Asignamos el usuario a req.user para usarlo en el resto de controladores
    req.user = {
      id: user.id,
      email: user.email,
      is_coordinator: Number(user.is_coordinator) === 1,
      is_active: Number(user.is_active) === 1
    };
    
    next();
  } catch (err) {
    console.error('Error en middleware de autenticación:', err);
    res.status(500).json({ error: 'Error interno auth: ' + err.message });
  }
};

// Helper para verificar roles fácilmente en los controladores
const isCoordinator = (req) => req.user?.is_coordinator === true;

module.exports = { requireAuth, isCoordinator };