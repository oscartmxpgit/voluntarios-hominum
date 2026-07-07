const express = require('express');
const cors = require('cors');
const { clerkMiddleware } = require('@clerk/express');

const app = express();

app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
app.use(express.json());
app.use(clerkMiddleware());

// Rutas
app.use('/api/volunteers', require('./routes/volunteer.routes'));
app.use('/api/time-entries', require('./routes/timeEntry.routes'));
app.use('/api/contact-submissions', require('./routes/contact.routes'));
app.use('/api/patients', require('./routes/patient.routes'));

app.listen(3000, () => console.log('Servidor en puerto 3000'));