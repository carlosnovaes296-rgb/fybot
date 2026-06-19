const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  // Check PM2 processes and start fybot if missing
  conn.exec(`pm2 list && cd /root/fybot && cat package.json | grep -i start`, (err, stream) => {
    if (err) throw err;
    stream
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()))
      .on('close', () => conn.end());
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
