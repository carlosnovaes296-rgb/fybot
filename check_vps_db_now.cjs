const { Client } = require('ssh2');
const conn = new Client();

const cmd = `cd /root/fybot && cat << 'EOF' > check_db.cjs
const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [users] = await connection.execute('SELECT id, name, email, referralCode, referredBy FROM users');
  console.log('Total users:', users.length);
  
  const referralCounts = {};
  users.forEach(u => {
    if (u.referredBy) {
      referralCounts[u.referredBy] = (referralCounts[u.referredBy] || 0) + 1;
    }
  });
  console.log('Referral counts:', referralCounts);
  
  const admin = users.find(u => u.id === 1 || u.id === '1' || String(u.referralCode) === 'ADMIN123');
  console.log('Admin:', admin);

  await connection.end();
}
check().catch(console.error);
EOF
node check_db.cjs
`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 10000,
});
