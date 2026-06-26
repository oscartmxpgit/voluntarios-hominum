require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: 'http://localhost:4200',
    credentials: true
}));

app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'hominum_db'
});

db.connect(err => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    console.log('Conectado a MySQL');
});

//
// =========================
// USERS (READ ONLY)
// =========================
//

// Get all allowed users
app.get('/api/users', (req, res) => {

    const sql = `
        SELECT id, email, is_coordinator, created_at
        FROM users
        ORDER BY email ASC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(results);
    });
});

// Get user by email
app.get('/api/users/by-email', (req, res) => {

    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const sql = `
        SELECT id, email, is_coordinator
        FROM users
        WHERE email = ?
        LIMIT 1
    `;

    db.query(sql, [email], (err, results) => {

        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ exists: false });
        }

        res.json({
            exists: true,
            user: results[0]
        });
    });
});

//
// =========================
// TIME ENTRIES (ROLE-AWARE)
// =========================
//

// GET (volunteers see only their own, coordinators see all)
app.get('/api/time-entries', (req, res) => {

    const { email, isCoordinator } = req.query;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    let sql = `
        SELECT *
        FROM time_entries
    `;

    const params = [];

    if (isCoordinator === '1') {
        sql += ` ORDER BY start_datetime DESC`;
    } else {
        sql += ` WHERE volunteer_email = ? ORDER BY start_datetime DESC`;
        params.push(email);
    }

    db.query(sql, params, (err, results) => {

        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(results);
    });
});

//
// CREATE
//
app.post('/api/time-entries', (req, res) => {

    const {
        volunteer_email,
        task_name,
        start_datetime,
        end_datetime,
        patient_name,
        comments
    } = req.body;

    const sql = `
        INSERT INTO time_entries
        (
            volunteer_email,
            task_name,
            start_datetime,
            end_datetime,
            patient_name,
            comments
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.execute(
        sql,
        [
            volunteer_email,
            task_name,
            start_datetime,
            end_datetime,
            patient_name,
            comments
        ],
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                id: result.insertId
            });
        }
    );
});

//
// UPDATE
//
app.put('/api/time-entries/:id', (req, res) => {

    const {
        task_name,
        start_datetime,
        end_datetime,
        patient_name,
        comments
    } = req.body;

    const sql = `
        UPDATE time_entries
        SET
            task_name = ?,
            start_datetime = ?,
            end_datetime = ?,
            patient_name = ?,
            comments = ?
        WHERE id = ?
    `;

    db.execute(
        sql,
        [
            task_name,
            start_datetime,
            end_datetime,
            patient_name,
            comments,
            req.params.id
        ],
        (err) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({ message: 'Actualizado' });
        }
    );
});

//
// DELETE
//
app.delete('/api/time-entries/:id', (req, res) => {

    db.execute(
        'DELETE FROM time_entries WHERE id = ?',
        [req.params.id],
        (err) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({ message: 'Eliminado' });
        }
    );
});

//
// START SERVER
//
app.listen(3000, () => {
    console.log('Servidor backend corriendo en puerto 3000');
});