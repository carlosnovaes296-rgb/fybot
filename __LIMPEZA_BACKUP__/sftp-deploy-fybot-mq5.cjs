const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    // Upload the corrected Fybot.mq5
    const content = fs.readFileSync('./dist/Fybot.mq5');
    const stream = sftp.createWriteStream('/root/fybot/dist/Fybot.mq5');
    stream.write(content);
    stream.end();
    
    stream.on('close', () => {
      console.log('Fybot.mq5 (corrigido) uploaded!');
      
      // Also upload to public/downloads if exists
      const pubContent = fs.readFileSync('./dist/Fybot.mq5');
      const pubStream = sftp.createWriteStream('/root/fybot/public/downloads/Fybot.mq5');
      pubStream.write(pubContent);
      pubStream.end();
      
      pubStream.on('close', () => {
        console.log('public/downloads/Fybot.mq5 uploaded!');
        
        // Restart PM2
        conn.exec('pm2 restart fybot', (err2, stream2) => {
          if (err2) throw err2;
          stream2.on('close', () => {
            console.log('DONE! Server restarted!');
            conn.end();
          }).on('data', d => process.stdout.write(d))
            .stderr.on('data', d => process.stderr.write(d));
        });
      });
    });
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
