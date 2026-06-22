const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected.');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    // Upload Fybot.ex5
    const content1 = fs.readFileSync('./public/downloads/Fybot.ex5');
    const stream1 = sftp.createWriteStream('/root/fybot/public/downloads/Fybot.ex5');
    stream1.write(content1);
    stream1.end();
    
    stream1.on('close', () => {
      console.log('Fybot.ex5 uploaded successfully!');
      
      // Upload FYBOT_V8_INSTITUTIONAL.ex5
      if (fs.existsSync('./public/downloads/FYBOT_V8_INSTITUTIONAL.ex5')) {
        const content2 = fs.readFileSync('./public/downloads/FYBOT_V8_INSTITUTIONAL.ex5');
        const stream2 = sftp.createWriteStream('/root/fybot/public/downloads/FYBOT_V8_INSTITUTIONAL.ex5');
        stream2.write(content2);
        stream2.end();
        stream2.on('close', () => {
           console.log('FYBOT_V8_INSTITUTIONAL.ex5 uploaded successfully!');
           conn.end();
        });
      } else {
        console.log('FYBOT_V8_INSTITUTIONAL.ex5 not found locally, skipping.');
        conn.end();
      }
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
