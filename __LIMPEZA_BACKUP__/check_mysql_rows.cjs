const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'fybot-do-user-15875883-0.c.db.ondigitalocean.com',
      user: 'doadmin',
      password: 'AVNS_Q4N7wH9jQ8z0L20rD1S',
      database: 'fybot_db',
      port: 25060,
      ssl: { rejectUnauthorized: false }
    });

    const [rows] = await conn.execute('SELECT id, LENGTH(data) as size FROM fybot_data');
    console.log(rows);

    await conn.end();
  } catch (err) {
    console.error(err);
  }
}

run();
