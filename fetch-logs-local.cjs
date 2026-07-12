const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('pm2 logs fybot --lines 50 --nostream --err 2>&1', (err, stream) => {
    if (err) throw err;
    let logData = '';
    stream.on('data', data => logData += data);
    stream.on('close', () => {
      fs.writeFileSync('remote-logs.txt', logData);
      console.log('✅ Logs salvos em remote-logs.txt');
      conn.end();
    });
  });
}).connect({
  host: '24.199.117.84',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('C:\\Users\\sobit\\.ssh\\id_rsa')
});
