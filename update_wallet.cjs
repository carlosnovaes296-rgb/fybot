const { Client } = require('ssh2');
const conn = new Client();

const cmd = `cd /root/fybot && cat << 'EOF' > update_mysql_wallet.cjs
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateWallet() {
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

    const newWallet = '0x8c46C0Df64C0C0070562e2007F6d9c0Aa7C5966b';
    
    await connection.execute('UPDATE users SET paymentWallet = ? WHERE role = "ADMIN" OR email = "fybotoficial22@gmail.com" OR email = "jfcn2020@gmail.com"', [newWallet]);
    await connection.execute('UPDATE users SET paymentWallet = ? WHERE paymentWallet IS NULL OR paymentWallet = "" OR paymentWallet LIKE "0x8c46C%"', [newWallet]);
    
    console.log('Payment wallet updated successfully in MySQL!');
    
    await connection.end();
  } catch(e) {
    console.error('MySQL Error:', e);
  }
}
updateWallet();
EOF
node update_mysql_wallet.cjs
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
