require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { clerkMiddleware, getAuth } = require('@clerk/express');

const app = express();

// =========================
// CORS
// =========================
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(clerkMiddleware());

// =========================
// DB
// =========================
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'hominum_db',
  waitForConnections: true,
  connectionLimit: 10
});

// =========================
// AUTH MIDDLEWARE (CLERK ID BASED)
// =========================
const requireAuth = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'No autorizado (sin Clerk userId)' });
    }

    console.log('LOOKUP USERID:', userId);


    const [rows] = await db.execute(
      'SELECT id, email, is_coordinator FROM users WHERE clerk_user_id = ?',
      [userId]
    );

    console.log('DB RESULT:', rows);

    if (!rows.length) {
      return res.status(403).json({ error: 'Usuario no registrado en BD' });
    }

    const user = rows[0];

    req.user = {
      id: user.id,
      email: user.email,
      is_coordinator: Number(user.is_coordinator) === 1
    };

    next();

  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ error: 'Error interno auth' });
  }
};

// =========================
// HELPERS
// =========================
const isCoordinator = (req) => req.user?.is_coordinator === true;

// =========================
// ROUTES
// =========================

// =========================
// ME (usuario actual)
// =========================
app.get('/api/users/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// =========================
// ROLE CHECK
// =========================
app.get('/api/users/check-role', requireAuth, (req, res) => {
  res.json({
    isCoordinator: isCoordinator(req)
  });
});

// =========================
// USERS (solo coordinador)
// =========================
app.get('/api/users', requireAuth, async (req, res) => {
  if (!isCoordinator(req)) {
    return res.status(403).json({ error: 'Solo coordinadores' });
  }

  const [rows] = await db.execute(
    'SELECT id, email, is_coordinator FROM users'
  );

  res.json(rows);
});

// =========================
// TIME ENTRIES (LIST)
// =========================
app.get('/api/time-entries', requireAuth, async (req, res) => {
  let sql = 'SELECT * FROM time_entries';
  const params = [];

  if (!isCoordinator(req)) {
    sql += ' WHERE volunteer_email = ?';
    params.push(req.user.email);
  }

  sql += ' ORDER BY start_datetime DESC';

  const [rows] = await db.execute(sql, params);
  res.json(rows);
});

// =========================
// CREATE TIME ENTRY
// =========================
app.post('/api/time-entries', requireAuth, async (req, res) => {
  const { task_name, start_datetime, end_datetime, patient_name, comments } = req.body;

  const [result] = await db.execute(
    `INSERT INTO time_entries 
     (volunteer_email, task_name, start_datetime, end_datetime, patient_name, comments)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.email, task_name, start_datetime, end_datetime, patient_name, comments]
  );

  res.status(201).json({ id: result.insertId });
});

// =========================
// UPDATE TIME ENTRY
// =========================
app.put('/api/time-entries/:id', requireAuth, async (req, res) => {
  const { task_name, start_datetime, end_datetime, patient_name, comments } = req.body;

  let sql = `
    UPDATE time_entries 
    SET task_name=?, start_datetime=?, end_datetime=?, patient_name=?, comments=? 
    WHERE id=?
  `;

  const params = [
    task_name,
    start_datetime,
    end_datetime,
    patient_name,
    comments,
    req.params.id
  ];

  if (!isCoordinator(req)) {
    sql += ' AND volunteer_email = ?';
    params.push(req.user.email);
  }

  const [result] = await db.execute(sql, params);

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'No autorizado o no existe' });
  }

  res.json({ message: 'OK' });
});

// =========================
// DELETE TIME ENTRY
// =========================
app.delete('/api/time-entries/:id', requireAuth, async (req, res) => {
  let sql = 'DELETE FROM time_entries WHERE id=?';
  const params = [req.params.id];

  if (!isCoordinator(req)) {
    sql += ' AND volunteer_email = ?';
    params.push(req.user.email);
  }

  const [result] = await db.execute(sql, params);

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'No autorizado o no existe' });
  }

  res.json({ message: 'OK' });
});

// =========================
// START SERVER
// =========================
app.listen(3000, () => {
  console.log('Backend Clerk running on port 3000');
});