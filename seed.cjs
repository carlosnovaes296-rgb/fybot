
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function seed() {
  if (!process.env.MYSQL_URL) {
    console.log('No MYSQL_URL, using local db.json instead.');
    process.exit(0);
  }
  try {
    const pool = mysql.createPool(process.env.MYSQL_URL);
    const data = fs.readFileSync(__dirname + '/data/db.json', 'utf-8');
    await pool.execute('INSERT INTO fybot_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = ?', [data, data]);
    console.log('MySQL successfully seeded from db.json!');
  } catch (err) {
    console.error('Error seeding MySQL:', err);
  }
  process.exit(0);
}
seed();
