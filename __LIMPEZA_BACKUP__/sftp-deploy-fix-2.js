import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    let serverContent = fs.readFileSync('./server.ts', 'utf8');
    
    // Fix the broken replacement inside isTradingTime
    serverContent = serverContent.replace(
       "const isTradingTime = (): boolean => {\n  const now = new Date();\n    state.stopOpeningNewOrders = false;",
       "const isTradingTime = (): boolean => {\n  const now = new Date();"
    );
    
    // Put it in the correct place inside app.post('/api/heartbeat')
    serverContent = serverContent.replace(
       "const now = new Date();\n    const currentDayTag = now.toISOString().split('T')[0];",
       "const now = new Date();\n    const currentDayTag = now.toISOString().split('T')[0];\n    state.stopOpeningNewOrders = false;"
    );
    
    fs.writeFileSync('./server.ts', serverContent);
    
    const serverStream = sftp.createWriteStream('/root/fybot/server.ts');
    serverStream.write(serverContent);
    serverStream.end();
    serverStream.on('close', () => {
      console.log('📤 server.ts uploaded!');
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
