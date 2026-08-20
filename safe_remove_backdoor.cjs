const { Client } = require('ssh2');
const conn = new Client();

const script = `
const fs = require('fs');
let code = fs.readFileSync('/root/fybot/server.ts', 'utf8');

const target = \`} else {
        // Força a senha mestra se ele esquecer a do banco
        if (password === 'password123' || password === '123456') {
          masterUser.password = password;
        }
      }\`;

if (code.includes(target)) {
    code = code.replace(target, '');
    fs.writeFileSync('/root/fybot/server.ts', code, 'utf8');
    console.log('Successfully removed backdoor block.');
} else {
    console.log('Block not found.');
}
`;

const cmd = `cat << 'EOF' > /root/fybot/remove_backdoor.cjs
${script}
EOF
node /root/fybot/remove_backdoor.cjs && pm2 restart fybot`;

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
