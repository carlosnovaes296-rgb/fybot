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
    const [users] = await pool.query('SELECT id, name, email, referralCode, referredBy FROM users');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Erro:", error.message);
  } finally {
    await pool.end();
  }
}

run();
