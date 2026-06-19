const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const readStream = fs.createReadStream('server.ts');
    const writeStream = sftp.createWriteStream('/root/fybot/server.ts');
    writeStream.on('close', () => {
      console.log('- file transferred');
      conn.exec('pm2 restart fybot', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('PM2 restarted');
          conn.end();
        }).on('data', (data) => {
          console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          console.log('STDERR: ' + data);
        });
      });
    });
    readStream.pipe(writeStream);
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H'
});
