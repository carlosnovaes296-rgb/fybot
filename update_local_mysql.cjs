const { Client } = require('ssh2');
const conn = new Client();

const script = `
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/root/fybot/.env' });

async function updatePassword() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || 'Fybot2026!',
        database: process.env.DB_NAME || 'fybot_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    
    try {
        const [result] = await pool.query(
            "UPDATE users SET password = ? WHERE role = 'ADMIN' OR email LIKE '%jfcn2020%' OR email LIKE '%carlosnovaes296%'",
            ['a@2026k@A']
        );
        console.log('Successfully updated local MySQL database:', result.affectedRows, 'rows affected.');
        
        const [rows] = await pool.query("SELECT email, password FROM users WHERE role = 'ADMIN' OR email LIKE '%jfcn2020%' OR email LIKE '%carlosnovaes296%'");
        console.log('Admins in MySQL now:', rows);
    } catch (e) {
        console.error('MySQL Error:', e.message);
    } finally {
        pool.end();
    }
}
updatePassword();
`;

const cmd = `cat << 'EOF' > /root/fybot/update_local_mysql.cjs
${script}
EOF
cd /root/fybot && node update_local_mysql.cjs && pm2 restart fybot`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log(out);
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000,
});
