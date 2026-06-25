require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Configuración de CORS
// Permite que tu frontend Angular (localhost:4200) haga peticiones a este servidor
app.use(cors({
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// Configuración de la conexión a MySQL usando variables de entorno
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'hominum_db'
});

db.connect((err) => {
    if (err) {
        console.error('Error al conectar a MySQL:', err);
        return;
    }
    console.log('Conectado a la base de datos MySQL');
});

// Endpoint: Guardar horas trabajadas
app.post('/api/time-entries', (req, res) => {
    const { volunteer_email, task_name, hours_worked, work_date, patient_name, comments } = req.body;

    const query = `
        INSERT INTO time_entries 
        (volunteer_email, task_name, hours_worked, work_date, patient_name, comments) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.execute(query, [volunteer_email, task_name, hours_worked, work_date, patient_name, comments], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al guardar el registro en la base de datos' });
        }
        res.status(201).json({ message: 'Registro creado correctamente', id: result.insertId });
    });
});

// Endpoint: Obtener horas (opcional, para tus reportes)
app.get('/api/time-entries', (req, res) => {
    db.query('SELECT * FROM time_entries ORDER BY work_date DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});