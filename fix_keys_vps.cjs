const { Client } = require('ssh2');

const conn = new Client();

const script = `
const mysql = require('mysql2/promise');

async function fixKeys() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Fybot2026!',
    database: 'fybot_db'
  });

  try {
    const [rows] = await connection.execute('SELECT id, userId, license_key FROM licenses WHERE license_key IS NULL OR license_key = ""');
    console.log("Found " + rows.length + " licenses without a key.");
    
    for (const row of rows) {
      const newKey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
      await connection.execute('UPDATE licenses SET license_key = ? WHERE id = ?', [newKey, row.id]);
      console.log("Updated license " + row.id + " for user " + row.userId + " with key " + newKey);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

fixKeys();
`;

conn.on('ready', () => {
  console.log('✅ Connected to VPS.');
  conn.exec(`cat << 'EOF' > /root/fybot/fix_keys.cjs\n${script}\nEOF\nnode /root/fybot/fix_keys.cjs && pm2 restart fybot`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('❌ Connection Error:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
