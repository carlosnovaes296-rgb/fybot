const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: 'fybot-do-user-15875883-0.c.db.ondigitalocean.com',
    user: 'doadmin',
    password: 'AVNS_Q4N7wH9jQ8z0L20rD1S',
    database: 'fybot_db',
    port: 25060
  });
  await conn.execute("UPDATE user_states SET botRunning = 1 WHERE user_id = '1'");
  console.log('botRunning updated to true for Admin');
  await conn.end();
}
run().catch(console.error);
