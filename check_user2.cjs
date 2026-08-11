const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Fybot2026!',
    database: process.env.DB_NAME || 'fybot_db',
  });

  try {
    const [rows] = await pool.query('SELECT * FROM users LIMIT 1');
    fs.writeFileSync('output.json', JSON.stringify(rows[0], null, 2));
  } catch (error) {
    fs.writeFileSync('output.json', error.message);
  } finally {
    await pool.end();
  }
}

run();
