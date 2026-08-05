const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('Uploading server.ts...');
    sftp.fastPut('./server.ts', '/root/fybot/server.ts', {}, (err) => {
      if (err) throw err;
      console.log('- server.ts transferred');
      console.log('Restarting PM2...');
      conn.exec('cd /root/fybot && pm2 restart fybot', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('Backend uploaded and PM2 restarted');
          conn.end();
        }).on('data', (data) => {
          console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          console.log('STDERR: ' + data);
        });
      });
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H'
});
