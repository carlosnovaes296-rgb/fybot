const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`pm2 logs fybot --lines 100 --nostream 2>&1`, (err, stream) => {
    if (err) throw err;
    stream
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()))
      .on('close', () => conn.end());
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
