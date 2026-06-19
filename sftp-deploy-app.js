import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    const appContent = fs.readFileSync('./src/App.tsx');
    const appStream = sftp.createWriteStream('/root/fybot/src/App.tsx');
    appStream.write(appContent);
    appStream.end();
    
    appStream.on('close', () => {
      console.log('📤 App.tsx uploaded!');
      
      const licContent = fs.readFileSync('./src/components/LicenseCountdown.tsx');
      const licStream = sftp.createWriteStream('/root/fybot/src/components/LicenseCountdown.tsx');
      licStream.write(licContent);
      licStream.end();
      
      licStream.on('close', () => {
        console.log('📤 LicenseCountdown.tsx uploaded!');
        
        console.log('🔄 Rebuilding the frontend and restarting server...');
        conn.exec('cd /root/fybot && npm run build && pm2 restart fybot', (err2, stream2) => {
          if (err2) throw err2;
          stream2.on('close', () => {
            console.log('\n🎉 DONE! Frontend updated!');
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
