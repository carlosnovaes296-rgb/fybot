const { Client } = require('ssh2');
const conn = new Client();

const script = `
const fs = require('fs');
let code = fs.readFileSync('/root/fybot/server.ts', 'utf8');

if (code.includes("password: 'password123'")) {
    code = code.replace(/password: 'password123'/g, "password: 'a@2026k@A'");
    fs.writeFileSync('/root/fybot/server.ts', code, 'utf8');
    console.log('Successfully updated default admin password in server.ts');
}
`;

const cmd = `cat << 'EOF' > /root/fybot/update_default_pwd.cjs
${script}
EOF
node /root/fybot/update_default_pwd.cjs && pm2 restart fybot`;

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
