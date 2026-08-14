const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('pm2 logs fybot --lines 100 --nostream', (err, stream) => {
    if (err) throw err;
    let logData = '';
    stream.on('close', (code, signal) => {
      fs.writeFileSync('./pm2_logs.txt', logData);
      console.log('Logs salvos em pm2_logs.txt');
      conn.end();
    }).on('data', (data) => {
      logData += data.toString();
    }).stderr.on('data', (data) => {
      logData += data.toString();
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H'
});
