const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Connected.');
  
  // Check what files are in public/downloads
  conn.exec('ls -la /root/fybot/public/downloads/ && echo "---" && file /root/fybot/public/downloads/Fybot.mq5 2>/dev/null && echo "---" && head -c 50 /root/fybot/public/downloads/Fybot.mq5 2>/dev/null', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      // Now upload the correct mq5 source file
      conn.sftp((sftpErr, sftp) => {
        if (sftpErr) { conn.end(); return; }
        
        const mq5Content = fs.readFileSync('./dist/Fybot.mq5', 'utf8');
        console.log('File starts with:', mq5Content.substring(0, 80));
        
        // Write as text explicitly
        const buf = Buffer.from(mq5Content, 'utf8');
        const writeStream = sftp.createWriteStream('/root/fybot/public/downloads/Fybot.mq5');
        writeStream.write(buf);
        writeStream.end();
        
        writeStream.on('close', () => {
          console.log('Fybot.mq5 re-uploaded as UTF-8 text!');
          
          // Verify the file on server
          conn.exec('head -c 100 /root/fybot/public/downloads/Fybot.mq5', (e2, s2) => {
            if (e2) { conn.end(); return; }
            s2.on('data', d => process.stdout.write('VPS file preview: ' + d));
            s2.on('close', () => conn.end());
          });
        });
      });
    }).on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', (err) => {
  console.error('SSH Error: ' + err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
