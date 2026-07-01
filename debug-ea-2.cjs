const { Client } = require('ssh2');
const conn = new Client();

const remoteScript = `
const fs = require('fs');
const filePath = '/root/fybot/server.ts';
let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes('[EA-DATA-JSON]')) {
  code = code.replace(
    'console.log(\`[HEARTBEAT-DEBUG] data=\${!!data}',
    'console.log(\`[EA-DATA-JSON] \${JSON.stringify(data)}\`);\\n    console.log(\`[HEARTBEAT-DEBUG] data=\${!!data}'
  );
  fs.writeFileSync(filePath, code);
  console.log('Log de JSON injetado com sucesso!');
} else {
  console.log('Log já injetado!');
}
`;

conn.on('ready', () => {
  conn.exec(`node -e "${remoteScript.replace(/"/g, '\\"')}" && pm2 restart fybot`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      setTimeout(() => {
        conn.exec('pm2 logs fybot --lines 30 --nostream', (err2, stream2) => {
          stream2.on('data', d => process.stdout.write(d));
          stream2.on('close', () => conn.end());
        });
      }, 5000); // 5 seconds wait
    }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
