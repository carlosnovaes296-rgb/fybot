import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    // Upload server.ts
    const serverContent = fs.readFileSync('./server.ts');
    const serverStream = sftp.createWriteStream('/root/fybot/server.ts');
    serverStream.write(serverContent);
    serverStream.end();
    
    serverStream.on('close', () => {
      console.log('📤 server.ts uploaded!');
      
      // Upload types.ts
      const typesContent = fs.readFileSync('./src/types.ts');
      const typesStream = sftp.createWriteStream('/root/fybot/src/types.ts');
      typesStream.write(typesContent);
      typesStream.end();
      
      typesStream.on('close', () => {
        console.log('📤 types.ts uploaded!');
        
        // Upload App.tsx
      const appContent = fs.readFileSync('./src/App.tsx');
      const appStream = sftp.createWriteStream('/root/fybot/src/App.tsx');
      appStream.write(appContent);
      appStream.end();
      
      appStream.on('close', () => {
        console.log('📤 App.tsx uploaded!');

        // Upload DerivBotEngine.ts
        const derivBotContent = fs.readFileSync('./backend/services/DerivBotEngine.ts');
        const derivBotStream = sftp.createWriteStream('/root/fybot/backend/services/DerivBotEngine.ts');
        derivBotStream.write(derivBotContent);
        derivBotStream.end();

        derivBotStream.on('close', () => {
          console.log('📤 DerivBotEngine.ts uploaded!');

          // Upload Indicators.ts
          const indContent = fs.readFileSync('./backend/services/Indicators.ts');
          const indStream = sftp.createWriteStream('/root/fybot/backend/services/Indicators.ts');
          indStream.write(indContent);
          indStream.end();

          indStream.on('close', () => {
            console.log('📤 Indicators.ts uploaded!');
        
            console.log('🔄 Rebuilding the frontend and restarting server...');
            conn.exec('cd /root/fybot && npm run build && pm2 restart fybot', (err2, stream2) => {
          if (err2) throw err2;
          stream2.on('close', () => {
            console.log('\n🎉 DONE! Backend and Frontend updated!');
            conn.end();
          }).on('data', d => process.stdout.write(d))
            .stderr.on('data', d => process.stderr.write(d));
        }); // conn.exec
          }); // indStream.on
        }); // derivBotStream.on
      }); // appStream.on
    }); // typesStream.on
  }); // serverStream.on
}); // conn.sftp
}).on('error', (err) => {
  console.error('SSH Error: ' + err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
