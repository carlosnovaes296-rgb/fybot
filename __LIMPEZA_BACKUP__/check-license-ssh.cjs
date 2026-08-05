const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /root/fybot && node -e "require('dotenv').config(); const mysql = require('mysql2/promise'); async function run() { const conn = await mysql.createConnection(process.env.MYSQL_URL); const [rows] = await conn.query('SELECT data FROM fybot_data ORDER BY id DESC LIMIT 1'); if (rows.length > 0) { const dbData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data; const licenses = dbData.licenses || []; const l = licenses.find(x => x.id === 'f5712e0c-9a72-448a-9ec6-7aec3ebd1b93' || x.key === 'f5712e0c-9a72-448a-9ec6-7aec3ebd1b93'); console.log('Found License in DB:', l); if (l) console.log('user state:', dbData.userStates && dbData.userStates[l.userId]); } await conn.end(); } run().catch(console.error);"`, (err, stream) => {
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
