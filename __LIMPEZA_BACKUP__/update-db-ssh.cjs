const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /root/fybot && node -e "const mysql = require('mysql2/promise'); async function run() { const conn = await mysql.createConnection({host: 'fybot-do-user-15875883-0.c.db.ondigitalocean.com', user: 'doadmin', password: 'AVNS_Q4N7wH9jQ8z0L20rD1S', database: 'fybot_db', port: 25060}); await conn.execute('UPDATE user_states SET botRunning = 1 WHERE user_id = \\'1\\''); console.log('botRunning updated to true for Admin'); await conn.end(); } run().catch(console.error);"`, (err, stream) => {
    stream.on('data', d => console.log(d.toString()))
          .on('close', () => conn.end())
          .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
