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
// GET
//
app.get('/api/time-entries', (req, res) => {

    const sql = `
        SELECT *
        FROM time_entries
        ORDER BY start_datetime DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results);
    });
});

//
// POST
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
        VALUES
        (
            ?, ?, ?, ?, ?, ?
        )
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
                return res.status(500).json({
                    error: err.message
                });
            }

            res.status(201).json({
                id: result.insertId
            });
        }
    );
});

//
// PUT
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
        err => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: 'Actualizado'
            });
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
        err => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: 'Eliminado'
            });
        }
    );
});

app.listen(
    3000,
    () => console.log('Servidor backend corriendo en puerto 3000')
);