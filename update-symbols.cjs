const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /root/fybot && node -e "require('dotenv').config(); const mysql = require('mysql2/promise'); async function run() { const conn = await mysql.createConnection(process.env.MYSQL_URL); const [rows] = await conn.query('SELECT id, data FROM fybot_data ORDER BY id DESC LIMIT 1'); if (rows.length > 0) { const rowId = rows[0].id; const dbData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data; if (!dbData.config) dbData.config = {}; if (!dbData.config.symbols) dbData.config.symbols = ['XAUUSD']; if (!dbData.config.symbols.includes('XAUUSDm')) { dbData.config.symbols.push('XAUUSDm'); } if (!dbData.config.symbols.includes('XAUUSDc')) { dbData.config.symbols.push('XAUUSDc'); } await conn.execute('UPDATE fybot_data SET data = ? WHERE id = ?', [JSON.stringify(dbData), rowId]); console.log('Successfully added XAUUSDm to config.symbols!'); } await conn.end(); } run().catch(console.error);"`, (err, stream) => {
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
