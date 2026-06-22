const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('pm2 logs fybot --lines 50 --nostream', (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', () => {
      fs.writeFileSync('pm2_output.txt', out);
      console.log('Logs written to pm2_output.txt');
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    }).stderr.on('data', (data) => {
      out += data.toString();
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
