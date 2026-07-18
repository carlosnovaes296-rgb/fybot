import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected. Uploading OTP update...');
  
  // Create api directory first!
  conn.exec('mkdir -p /root/fybot/src/api', (errMkdir, streamMkdir) => {
    if (errMkdir) throw errMkdir;
    
    streamMkdir.on('close', () => {
      conn.sftp((err, sftp) => {
        if (err) throw err;
        
        // Upload config.ts
        const configContent = fs.readFileSync('./src/config.ts');
        const configStream = sftp.createWriteStream('/root/fybot/src/config.ts');
        configStream.write(configContent);
        configStream.end();
        
        configStream.on('close', () => {
          console.log('📤 config.ts uploaded!');
          
          // Upload derivOtp.ts
          const otpContent = fs.readFileSync('./src/api/derivOtp.ts');
          const otpStream = sftp.createWriteStream('/root/fybot/src/api/derivOtp.ts');
          otpStream.write(otpContent);
          otpStream.end();
          
          otpStream.on('close', () => {
            console.log('📤 derivOtp.ts uploaded!');
            
            // Upload App.tsx
            const appContent = fs.readFileSync('./src/App.tsx');
            const appStream = sftp.createWriteStream('/root/fybot/src/App.tsx');
            appStream.write(appContent);
            appStream.end();
            
            appStream.on('close', () => {
              console.log('📤 App.tsx uploaded!');

              // Upload server.ts
              const serverContent = fs.readFileSync('./server.ts');
              const serverStream = sftp.createWriteStream('/root/fybot/server.ts');
              serverStream.write(serverContent);
              serverStream.end();
              serverStream.on('close', () => {
                console.log('📤 server.ts uploaded!');

                // Upload TradingChart
                const chartContent = fs.readFileSync('./src/components/TradingChart.tsx');
                const chartStream = sftp.createWriteStream('/root/fybot/src/components/TradingChart.tsx');
                chartStream.write(chartContent);
                chartStream.end();
                
                chartStream.on('close', () => {
                  console.log('📤 TradingChart.tsx uploaded!');
                  
                  // Now restart PM2
                  console.log('🔄 Rebuilding the frontend and restarting server...');
                  conn.exec('cd /root/fybot && npm run build && pm2 restart 0', (errExec, streamExec) => {
                    if (errExec) throw errExec;
                    streamExec.on('data', (data) => process.stdout.write(data.toString()));
                    streamExec.stderr.on('data', (data) => process.stderr.write(data.toString()));
                    streamExec.on('close', () => {
                      console.log('\\n🎉 DONE! Backend and Frontend updated com sucesso no VPS!');
                      conn.end();
                    });
                  });
                });
              }); // serverStream.on
            }); // appStream.on
          }); // otpStream.on
        }); // configStream.on
      }); // conn.sftp
    }).resume(); // MUST call resume() to drain the stream so it emits 'close'
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
