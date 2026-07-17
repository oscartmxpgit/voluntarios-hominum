const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, isCoordinator } = require('../middleware/auth');

// Necesitarás instalar node-fetch si usas versiones antiguas de Node.js
// npm install node-fetch
const fetch = require('node-fetch'); 

router.post('/', async (req, res) => { // He quitado requireAuth si es un formulario público
  const { name, email, phone, message, recaptcha } = req.body;

  // 1. Verificar el token de reCAPTCHA con Google
  const secretKey = process.env.RECAPTCHA_SECRET_KEY; // ESTO VIENE DE TU .ENV
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptcha}`;

  try {
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();

    if (!data.success) {
      return res.status(400).json({ error: 'Validación de reCAPTCHA fallida. ¿Eres un bot?' });
    }

    // 2. Si es exitoso, procedemos a guardar en la base de datos
    const [result] = await db.execute(
      'INSERT INTO contact_submissions (name, email, phone, message) VALUES (?, ?, ?, ?)', 
      [name, email, phone, message]
    );
    
    res.status(201).json({ id: result.insertId });

  } catch (error) {
    console.error('Error al verificar reCAPTCHA o insertar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) return res.status(403).json({ error: 'Solo coordinadores' });
  const [rows] = await db.execute('SELECT * FROM contact_submissions ORDER BY created_at DESC');
  res.json(rows);
});

router.patch('/:id', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) return res.status(403).json({ error: 'Solo coordinadores' });
  await db.execute('UPDATE contact_submissions SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?', [req.body.status, req.params.id]);
  res.json({ message: 'Estado actualizado' });
});

module.exports = router;