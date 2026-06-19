const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat /root/.pm2/logs/fybot-out.log | grep USER', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d)).on('close', () => conn.end());
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
