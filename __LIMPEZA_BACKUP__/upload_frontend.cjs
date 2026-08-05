const { Client } = require('ssh2');
const AdmZip = require('adm-zip');
const fs = require('fs');

const zip = new AdmZip();
zip.addLocalFolder('./dist');
zip.writeZip('./dist.zip');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('Uploading with fastPut...');
    sftp.fastPut('./dist.zip', '/root/fybot/dist.zip', {}, (err) => {
      if (err) throw err;
      console.log('- zip transferred');
      conn.exec('cd /root/fybot && rm -rf dist && unzip -o dist.zip -d dist && export NODE_ENV=production && pm2 restart fybot --update-env', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('Frontend extracted and PM2 restarted');
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
