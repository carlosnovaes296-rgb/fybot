const { Client } = require('ssh2');
const conn = new Client();

const cmd = `cd /root/fybot && cat << 'EOF' > check_recent_payments.cjs
const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Fybot2026!',
    database: process.env.DB_NAME || 'fybot_db'
  });

  const [payments] = await connection.execute('SELECT * FROM payments ORDER BY createdAt DESC LIMIT 10');
  console.log('--- RECENT PAYMENTS ---');
  payments.forEach(p => {
    console.log(\`ID: \... | UserID: \${p.userId} | Amount: \${p.amount} | Status: \${p.status} | CreatedAt: \${p.createdAt}\`);
  });
  console.log('-----------------------');

  await connection.end();
}
check().catch(console.error);
EOF
node check_recent_payments.cjs
`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 10000,
});
