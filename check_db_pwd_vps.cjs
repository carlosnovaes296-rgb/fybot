const { Client } = require('ssh2');
const conn = new Client();

const script = `
const fs = require('fs');
try {
    const raw = fs.readFileSync('/root/fybot/data/db.json', 'utf8');
    const db = JSON.parse(raw);
    const admins = db.users.filter(u => u.role === 'ADMIN' || u.email.includes('jfcn2020') || u.email.includes('carlosnovaes296'));
    console.log(JSON.stringify(admins, null, 2));
} catch (e) {
    console.error(e);
}
`;

const cmd = `cat << 'EOF' > /root/fybot/check_db_pwd.cjs
${script}
EOF
node /root/fybot/check_db_pwd.cjs`;

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
