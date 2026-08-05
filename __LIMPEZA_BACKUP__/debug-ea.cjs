const { Client } = require('ssh2');
const conn = new Client();

const remoteScript = `
const fs = require('fs');
const filePath = '/root/fybot/server.ts';
let code = fs.readFileSync(filePath, 'utf8');

// Adiciona um log detalhado para entender os dados que chegam do EA
if (!code.includes('EA-DATA-DUMP')) {
  code = code.replace(
    'if (!data) { console.log(\`[HEARTBEAT-SKIP] No market data from EA\`); }',
    'console.log(\`[EA-DATA-DUMP] keys=\${Object.keys(data||{})}\`);\\n    if (!data) { console.log(\`[HEARTBEAT-SKIP] No market data from EA\`); }'
  );
  fs.writeFileSync(filePath, code);
  console.log('Modificado server.ts');
} else {
  console.log('Ja estava modificado');
}
`;

conn.on('ready', () => {
  conn.exec(`node -e "${remoteScript.replace(/"/g, '\\"')}" && pm2 restart fybot`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      // Espera 3 segundos para o bot receber heartbeats e pega os logs
      setTimeout(() => {
        conn.exec('pm2 logs fybot --lines 20 --nostream', (err2, stream2) => {
          stream2.on('data', d => process.stdout.write(d));
          stream2.on('close', () => conn.end());
        });
      }, 3000);
    }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
