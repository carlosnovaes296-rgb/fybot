const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`pm2 logs fybot --lines 30 --nostream --err 2>&1`, (err, stream) => {
    if (err) throw err;
    let out = "";
    stream
      .on('data', d => { out += d.toString(); })
      .stderr.on('data', d => { out += d.toString(); })
      .on('close', () => {
        const fs = require('fs');
        fs.writeFileSync('server-error.log', out);
        conn.end();
      });
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
