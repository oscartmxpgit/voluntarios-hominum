require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); // Usamos versión promise para mejor async/await
const cors = require('cors');
const { clerkMiddleware, getAuth } = require('@clerk/express');

const app = express();

app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
app.use(express.json());

// Inicialización de Clerk (asegúrate de tener CLERK_SECRET_KEY en tu .env)
app.use(clerkMiddleware());

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'hominum_db',
    waitForConnections: true,
    connectionLimit: 10
});

// Middleware para verificar si el usuario existe en nuestra BD y si es coordinador
const requireAuth = async (req, res, next) => {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    // Obtenemos info del usuario desde MySQL usando el ID de Clerk
    const [rows] = await db.execute(
        'SELECT email, is_coordinator FROM users WHERE clerk_user_id = ?', 
        [userId]
    );

    if (rows.length === 0) return res.status(403).json({ error: 'Usuario no registrado en sistema' });
    
    req.user = rows[0]; // Guardamos info en req para usarla después
    next();
};

//
// =========================
// USERS
// =========================
app.get('/api/users/me', requireAuth, async (req, res) => {
    res.json(req.user);
});

app.get('/api/users', requireAuth, async (req, res) => {
    if (!req.user.is_coordinator) return res.status(403).json({ error: 'Solo coordinadores' });
    const [rows] = await db.execute('SELECT id, email, is_coordinator FROM users');
    res.json(rows);
});

//
// =========================
// TIME ENTRIES (ROLE-AWARE)
// =========================
app.get('/api/time-entries', requireAuth, async (req, res) => {
    let sql = 'SELECT * FROM time_entries';
    const params = [];

    if (!req.user.is_coordinator) {
        sql += ' WHERE volunteer_email = ?';
        params.push(req.user.email);
    }
    sql += ' ORDER BY start_datetime DESC';

    const [results] = await db.execute(sql, params);
    res.json(results);
});

app.post('/api/time-entries', requireAuth, async (req, res) => {
    const { task_name, start_datetime, end_datetime, patient_name, comments } = req.body;
    const sql = `INSERT INTO time_entries (volunteer_email, task_name, start_datetime, end_datetime, patient_name, comments) VALUES (?, ?, ?, ?, ?, ?)`;
    
    const [result] = await db.execute(sql, [req.user.email, task_name, start_datetime, end_datetime, patient_name, comments]);
    res.status(201).json({ id: result.insertId });
});

app.put('/api/time-entries/:id', requireAuth, async (req, res) => {
    const { task_name, start_datetime, end_datetime, patient_name, comments } = req.body;
    
    // Si no es coordinador, verificar que el evento sea suyo antes de actualizar
    let sql = 'UPDATE time_entries SET task_name=?, start_datetime=?, end_datetime=?, patient_name=?, comments=? WHERE id=?';
    const params = [task_name, start_datetime, end_datetime, patient_name, comments, req.params.id];

    if (!req.user.is_coordinator) {
        sql += ' AND volunteer_email = ?';
        params.push(req.user.email);
    }

    const [result] = await db.execute(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No autorizado o no encontrado' });
    res.json({ message: 'Actualizado' });
});

app.delete('/api/time-entries/:id', requireAuth, async (req, res) => {
    let sql = 'DELETE FROM time_entries WHERE id = ?';
    const params = [req.params.id];

    if (!req.user.is_coordinator) {
        sql += ' AND volunteer_email = ?';
        params.push(req.user.email);
    }

    const [result] = await db.execute(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No autorizado o no encontrado' });
    res.json({ message: 'Eliminado' });
});

app.listen(3000, () => console.log('Servidor backend con Clerk corriendo en puerto 3000'));