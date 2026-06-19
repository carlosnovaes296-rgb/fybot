const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const localFile = path.join(__dirname, 'server.ts');
const remoteFile = '/root/fybot/server.ts';

console.log('Reading local server.ts...');
const content = fs.readFileSync(localFile, 'utf8');
console.log(`Local file size: ${content.length} bytes, ${content.split('\n').length} lines`);

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ SSH Connected. Uploading server.ts...');
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP error:', err); conn.end(); return; }
    const writeStream = sftp.createWriteStream(remoteFile);
    writeStream.on('close', () => {
      console.log('✅ File uploaded! Restarting server...');
      conn.exec('/usr/lib/node_modules/pm2/bin/pm2 restart fybot', (err, stream) => {
        if (err) { console.error(err); conn.end(); return; }
        let out = '';
        stream.on('data', d => { out += d; process.stdout.write(d); })
              .stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => {
          console.log('\n🎉 Done! Server restarted.');
          conn.end();
        });
      });
    });
    writeStream.on('error', (err) => {
      console.error('Write error:', err);
      conn.end();
    });
    writeStream.write(content);
    writeStream.end();
  });
}).on('error', (err) => {
  console.error('SSH Error:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
