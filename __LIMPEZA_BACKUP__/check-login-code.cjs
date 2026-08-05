const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  // Pega as linhas ao redor do /api/login no server.ts real do VPS
  conn.exec(`grep -n "password" /root/fybot/server.ts | tail -20`, (err, stream) => {
    if (err) throw err;
    stream
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()))
      .on('close', () => conn.end());
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
