const { Client } = require('ssh2');
const conn = new Client();

const cmd = `cd /root/fybot && cat << 'EOF' > update_mysql_password.cjs
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updatePassword() {
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

    const email = 'fybotoficial22@gmail.com';
    const newPassword = '123456789';
    
    await connection.execute('UPDATE users SET password = ? WHERE email = ?', [newPassword, email]);
    
    console.log('Password updated successfully in MySQL!');
    
    await connection.end();
  } catch(e) {
    console.error('MySQL Error:', e);
  }
}
updatePassword();
EOF
node update_mysql_password.cjs
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
