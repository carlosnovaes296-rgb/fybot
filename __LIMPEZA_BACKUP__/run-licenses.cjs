
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: '/root/fybot/.env' });

async function run() {
  try {
    const conn = await mysql.createConnection(process.env.MYSQL_URL + '?ssl={"rejectUnauthorized":false}');
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
