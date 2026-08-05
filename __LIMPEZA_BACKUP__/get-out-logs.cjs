const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('tail -n 50 /root/.pm2/logs/fybot-out.log', (err, stream) => {
    if (err) throw err;
    let dataOut = '';
    stream.on('close', (code, signal) => {
      fs.writeFileSync('out-utf8.log', dataOut, 'utf8');
      console.log("Log salvo em out-utf8.log");
      conn.end();
    }).on('data', (data) => {
      dataOut += data;
    }).stderr.on('data', (data) => {
      // ignore
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
