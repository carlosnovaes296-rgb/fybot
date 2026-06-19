const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    // Upload server.ts
    const serverContent = fs.readFileSync('./server.ts');
    const serverStream = sftp.createWriteStream('/root/fybot/server.ts');
    serverStream.write(serverContent);
    serverStream.end();
    
    serverStream.on('close', () => {
      console.log('server.ts uploaded!');
      
      // Upload EA (public)
      const eaPublicContent = fs.readFileSync('./public/downloads/FYBOT_V8_INSTITUTIONAL.mq5');
      const eaPublicStream = sftp.createWriteStream('/root/fybot/public/downloads/FYBOT_V8_INSTITUTIONAL.mq5');
      eaPublicStream.write(eaPublicContent);
      eaPublicStream.end();
      
      eaPublicStream.on('close', () => {
        console.log('EA (public) uploaded!');
        
        // Upload EA (dist)
        const eaDistContent = fs.readFileSync('./dist/downloads/FYBOT_V8_INSTITUTIONAL.mq5');
        const eaDistStream = sftp.createWriteStream('/root/fybot/dist/downloads/FYBOT_V8_INSTITUTIONAL.mq5');
        eaDistStream.write(eaDistContent);
        eaDistStream.end();
        
        eaDistStream.on('close', () => {
          console.log('EA (dist) uploaded!');
          
          // Execute node inline script to update db.json and restart PM2
          const scriptToRun = `
            const fs = require('fs');
            const path = '/root/fybot/data/db.json';
            if (fs.existsSync(path)) {
               let data = JSON.parse(fs.readFileSync(path, 'utf8'));
               if (data.config) {
                   data.config.minScore = 40;
                   fs.writeFileSync(path, JSON.stringify(data, null, 2));
                   console.log('db.json minScore updated to 40!');
               }
            }
          `;
          
          conn.exec(`node -e "${scriptToRun.replace(/"/g, '\\"')}" && cd /root/fybot && pm2 restart fybot`, (err2, stream2) => {
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
