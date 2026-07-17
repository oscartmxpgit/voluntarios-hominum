const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

// Nota: No necesitas require('node-fetch') en Node.js 18+. 
// Si tu servidor usa una versión anterior, instálalo con: npm install node-fetch

router.post('/', async (req, res) => {
  const { name, email, phone, message, recaptcha } = req.body;

  // Validación de seguridad para evitar errores 500 si la clave no existe
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    console.error('ERROR: RECAPTCHA_SECRET_KEY no está definida en el entorno.');
    return res.status(500).json({ error: 'Configuración del servidor incompleta.' });
  }

  // 1. Verificar el token de reCAPTCHA con Google
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptcha}`;

  try {
    // Usamos el fetch global (nativo)
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();

    if (!data.success) {
      console.warn('Intento de envío fallido (CAPTCHA):', data['error-codes']);
      return res.status(400).json({ error: 'Validación de reCAPTCHA fallida. ¿Eres un bot?' });
    }

    // 2. Si es exitoso, procedemos a guardar en la base de datos
    const sql = 'INSERT INTO contact_submissions (name, email, phone, message) VALUES (?, ?, ?, ?)';
    const [result] = await db.execute(sql, [name, email, phone, message]);

    res.status(201).json({ id: result.insertId });

  } catch (error) {
    console.error('ERROR DETALLADO:', error);
    // DEBUG: Enviamos el error al cliente para que puedas verlo en el navegador (Network Tab)
    res.status(500).json({
      error: 'Error interno',
      details: error.message,
      stack: error.stack
    });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    if (!isCoordinator(req)) return res.status(403).json({ error: 'Solo coordinadores' });
    const [rows] = await db.execute('SELECT * FROM contact_submissions ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!isCoordinator(req)) return res.status(403).json({ error: 'Solo coordinadores' });

    const { status } = req.body;
    const { id } = req.params;

    await db.execute(
      'UPDATE contact_submissions SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    res.json({ message: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al actualizar registro:', error);
    res.status(500).json({ error: 'Error al actualizar base de datos' });
  }
});

module.exports = router;