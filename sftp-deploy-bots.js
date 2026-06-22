import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    let uploads = 0;
    const totalFiles = 4;
    
    const checkDone = () => {
      uploads++;
      if (uploads === totalFiles) {
        console.log('\n🎉 DONE! Bots uploaded!');
        conn.end();
      }
    };

    const uploadFile = (local, remote) => {
      try {
        const content = fs.readFileSync(local);
        const stream = sftp.createWriteStream(remote);
        stream.write(content);
        stream.end();
        stream.on('close', () => {
          console.log(`📤 ${local} uploaded!`);
          checkDone();
        });
      } catch (e) {
        console.log(`❌ Failed to upload ${local}: ${e.message}`);
        checkDone();
      }
    };

    uploadFile('./public/downloads/Fybot.mq5', '/root/fybot/public/downloads/Fybot.mq5');
    uploadFile('./public/downloads/Fybot.ex5', '/root/fybot/public/downloads/Fybot.ex5');
    uploadFile('./public/downloads/FYBOT_V8_INSTITUTIONAL.mq5', '/root/fybot/public/downloads/FYBOT_V8_INSTITUTIONAL.mq5');
    uploadFile('./public/downloads/FYBOT_V8_INSTITUTIONAL.ex5', '/root/fybot/public/downloads/FYBOT_V8_INSTITUTIONAL.ex5');
  });
}).on('error', (err) => {
  console.error('SSH Error: ' + err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
