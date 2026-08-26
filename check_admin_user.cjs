const { Client } = require('ssh2');
const conn = new Client();

const cmd = `cd /root/fybot && cat << 'EOF' > check_admin_user.cjs
const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  try {
    let connection;
    if (process.env.MYSQL_URL) {
      connection = await mysql.createConnection(process.env.MYSQL_URL + '?ssl={"rejectUnauthorized":false}');
    } else {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || 'Fybot2026!',
        database: process.env.DB_NAME || 'fybot_db'
      });
    }

    const [rows] = await connection.execute('SELECT id, name, email, password, role, status FROM users WHERE email = ?', ['fybotoficial22@gmail.com']);
    console.log('ADMIN USER RECORD:', JSON.stringify(rows, null, 2));
    
    await connection.end();
  } catch(e) {
    console.error('MySQL Error:', e);
  }
}
check();
EOF
node check_admin_user.cjs
`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
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
