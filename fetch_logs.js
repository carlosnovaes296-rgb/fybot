const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('/usr/lib/node_modules/pm2/bin/pm2 logs fybot --lines 50 --nostream', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
