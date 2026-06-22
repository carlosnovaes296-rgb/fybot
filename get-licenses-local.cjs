const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/root/fybot/.env' });

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_URL ? new URL(process.env.MYSQL_URL).hostname : 'fybot-do-user-15875883-0.c.db.ondigitalocean.com',
      port: process.env.MYSQL_URL ? new URL(process.env.MYSQL_URL).port : 25060,
      user: 'doadmin',
      password: process.env.MYSQL_URL ? new URL(process.env.MYSQL_URL).password : 'AVNS_Kz9HlD8m_v7W-mSST_w',
      database: 'fybot',
      ssl: { rejectUnauthorized: false }
    });

    const [rows] = await conn.execute('SELECT data FROM fybot_data WHERE id = 1');
    if (rows.length > 0) {
      const dbData = JSON.parse(rows[0].data);
      console.log(JSON.stringify(dbData.licenses, null, 2));
    }
    await conn.end();
  } catch (err) {
    console.error(err);
  }
}

run();
