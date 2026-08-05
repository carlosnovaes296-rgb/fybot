const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /root/fybot && node -e "const mysql = require('mysql2/promise'); async function run() { const url = 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-do-user-36307313-0.a.db.ondigitalocean.com:25060/defaultdb?ssl={\\\"rejectUnauthorized\\\":false}'; const conn = await mysql.createConnection(url); const [rows] = await conn.query('SELECT id, data FROM fybot_data ORDER BY id DESC LIMIT 1'); if (rows.length > 0) { const rowId = rows[0].id; const dbData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data; let updated = false; dbData.users.forEach(u => { if (u.id === '1jsleiedp' || u.id === 'dr0f4wf1x') { u.role = 'ADMIN'; console.log('User ' + u.name + ' (' + u.id + ') is now ADMIN'); updated = true; } }); if (updated) { await conn.execute('UPDATE fybot_data SET data = ? WHERE id = ?', [JSON.stringify(dbData), rowId]); console.log('Successfully updated database!'); } else { console.log('No user found to update.'); } } await conn.end(); } run().catch(console.error);"`, (err, stream) => {
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
