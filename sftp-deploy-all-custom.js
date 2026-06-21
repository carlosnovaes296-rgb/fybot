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
        console.log('🔄 Rebuilding the frontend and restarting server...');
        conn.exec('cd /root/fybot && npm run build && pm2 restart fybot', (err2, stream2) => {
          if (err2) throw err2;
          stream2.on('close', () => {
            console.log('\n🎉 DONE! Backend and Frontend updated!');
            conn.end();
          }).on('data', d => process.stdout.write(d))
            .stderr.on('data', d => process.stderr.write(d));
        });
      }
    };

    const uploadFile = (local, remote) => {
      const content = fs.readFileSync(local);
      const stream = sftp.createWriteStream(remote);
      stream.write(content);
      stream.end();
      stream.on('close', () => {
        console.log(`📤 ${local} uploaded!`);
        checkDone();
      });
    };

    uploadFile('./server.ts', '/root/fybot/server.ts');
    uploadFile('./src/App.tsx', '/root/fybot/src/App.tsx');
    uploadFile('./src/translations.ts', '/root/fybot/src/translations.ts');
    uploadFile('./src/components/DailyTargetSystem.tsx', '/root/fybot/src/components/DailyTargetSystem.tsx');
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
