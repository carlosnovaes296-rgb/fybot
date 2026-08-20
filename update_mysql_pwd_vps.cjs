const { Client } = require('ssh2');
const conn = new Client();

const script = `
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/root/fybot/.env' });

async function updatePassword() {
    if (!process.env.MYSQL_URL) {
        console.log('No MYSQL_URL in .env');
        return;
    }
    const pool = mysql.createPool(process.env.MYSQL_URL + '?ssl={"rejectUnauthorized":false}');
    
    try {
        const [result] = await pool.query(
            "UPDATE users SET password = ? WHERE role = 'ADMIN' OR email LIKE '%jfcn2020%' OR email LIKE '%carlosnovaes296%'",
            ['a@2026k@A']
        );
        console.log('Successfully updated MySQL database:', result.affectedRows, 'rows affected.');
    } catch (e) {
        console.error('MySQL Error:', e.message);
    } finally {
        pool.end();
    }
}
updatePassword();
`;

const cmd = `cat << 'EOF' > /root/fybot/update_mysql_pwd.cjs
${script}
EOF
cd /root/fybot && node update_mysql_pwd.cjs`;

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
