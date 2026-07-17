const express = require('express');
const cors = require('cors');
const { clerkMiddleware } = require('@clerk/express');

const app = express();

// Configuración de CORS para permitir tu dominio de producción y desarrollo local
app.use(cors({
    origin: ['https://voluntariadohominum.org', 'http://localhost:4200'],
    credentials: true
}));

app.use(express.json());

// IMPORTANTE: clerkMiddleware DEBE registrarse ANTES de las rutas
app.use(clerkMiddleware());

// Rutas (usando el prefijo /backend/api para evitar conflictos con el frontend Angular)
app.use('/backend/api/volunteers', require('./routes/volunteer.routes'));
app.use('/backend/api/time-entries', require('./routes/timeEntry.routes'));
app.use('/backend/api/contact-submissions', require('./routes/contact.routes'));
app.use('/backend/api/patients', require('./routes/patient.routes'));
app.use('/backend/api/general-events', require('./routes/eventTypes.routes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));