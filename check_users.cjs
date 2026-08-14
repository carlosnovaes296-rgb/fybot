const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Fybot2026!',
    database: process.env.DB_NAME || 'fybot_db',
  });

  try {
    const [users] = await pool.query('SELECT id, name, email, role, derivTokenDemo, derivTokenReal FROM users');
    console.log('--- USUÁRIOS NO BANCO DE DADOS ---');
    console.log(users);
    
    const [licenses] = await pool.query('SELECT * FROM licenses');
    console.log('\n--- LICENÇAS NO BANCO DE DADOS ---');
    console.log(licenses);
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}

check();
