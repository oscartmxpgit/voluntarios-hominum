const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'volunteers_root',
  password: process.env.DB_PASSWORD || 'W3yWR&ZLBG3A5J',
  database: process.env.DB_NAME || 'hominum_db',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = db;