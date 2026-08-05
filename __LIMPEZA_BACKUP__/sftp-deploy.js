import { Client } from 'ssh2';
import fs from 'fs';

const MYSQL_URL = 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-do-user-36307313-0.a.db.ondigitalocean.com:25060/defaultdb';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  // Step 1: Upload server.ts directly via SFTP
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    // Write the .env file
    const envContent = `MYSQL_URL="${MYSQL_URL}"\n`;
    const envStream = sftp.createWriteStream('/root/fybot/.env');
    envStream.write(envContent);
    envStream.end();
    envStream.on('close', () => {
      console.log('📝 .env written with MySQL credentials!');
      
      // Upload the new server.ts with MySQL support
      const serverContent = fs.readFileSync('./server.ts');
      const serverStream = sftp.createWriteStream('/root/fybot/server.ts');
      serverStream.write(serverContent);
      serverStream.end();
      serverStream.on('close', () => {
        console.log('📤 server.ts uploaded!');
        
        // Install mysql2 and restart
        conn.exec('cd /root/fybot && npm install mysql2 --legacy-peer-deps && pm2 restart fybot', (err2, stream2) => {
          if (err2) throw err2;
          stream2.on('close', () => {
            console.log('\n🎉 DONE! Server restarted with MySQL DigitalOcean!');
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
