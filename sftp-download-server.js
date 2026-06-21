import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    // Download server.ts
    const serverStream = sftp.createReadStream('/root/fybot/server.ts');
    const localStream = fs.createWriteStream('./server.ts');
    
    serverStream.pipe(localStream);
    
    localStream.on('close', () => {
      console.log('✅ server.ts downloaded and restored successfully!');
      conn.end();
    });
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
