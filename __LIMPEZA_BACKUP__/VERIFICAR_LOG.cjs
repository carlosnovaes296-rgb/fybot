const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  conn.exec('/usr/lib/node_modules/pm2/bin/pm2 logs fybot --lines 20 --nostream', (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('data', (data) => output += data.toString());
    stream.on('close', () => {
       console.log("=== LOGS DO BACKEND (PM2) ===");
       console.log(output);
       conn.end();
    });
  });
}).on('error', (err) => {
  console.log('❌ Erro:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
