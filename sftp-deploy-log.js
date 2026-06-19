import { Client } from 'ssh2';
import fs from 'fs';

const MYSQL_URL = 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-do-user-36307313-0.a.db.ondigitalocean.com:25060/defaultdb';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    // Read server.ts locally
    let serverContent = fs.readFileSync('./server.ts', 'utf8');
    
    // Add a console.log for the data received
    if (!serverContent.includes("console.log(`[DATA]`")) {
       serverContent = serverContent.replace(
         "if (data && state.botRunning && !state.systemBlocked && isTradingTime()) {",
         "console.log(`[DATA]`, JSON.stringify(data));\n    if (data && state.botRunning && !state.systemBlocked && isTradingTime()) {"
       );
       fs.writeFileSync('./server.ts', serverContent);
    }
    
    // Upload it
    const serverStream = sftp.createWriteStream('/root/fybot/server.ts');
    serverStream.write(serverContent);
    serverStream.end();
    serverStream.on('close', () => {
      console.log('📤 server.ts uploaded!');
      
      // Restart pm2
      conn.exec('cd /root/fybot && pm2 restart fybot', (err2, stream2) => {
        if (err2) throw err2;
        stream2.on('close', () => {
          console.log('🎉 Server restarted!');
          conn.end();
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
