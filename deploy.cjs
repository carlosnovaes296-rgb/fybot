const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const localServerFile = 'c:\\Users\\sobit\\OneDrive\\Área de Trabalho\\Fybot pro\\server.ts';

conn.on('ready', () => {
  console.log('SSH Connection Established.');
  
  // Execute pm2 jlist to find the directory automatically
  conn.exec('pm2 jlist', (err, stream) => {
    if (err) {
      console.error('Error executing pm2 jlist', err);
      conn.end();
      return;
    }
    
    let data = '';
    stream.on('data', (d) => {
      data += d;
    }).on('close', () => {
      try {
        const apps = JSON.parse(data);
        const fybotApp = apps.find(a => a.name === 'fybot') || apps[0];
        
        if (!fybotApp || !fybotApp.pm2_env) {
          console.error("PM2 app not found!");
          conn.end();
          return;
        }
        
        const cwd = fybotApp.pm2_env.pm_cwd;
        console.log('Found project folder on VPS:', cwd);
        
        // Start SFTP
        conn.sftp((err, sftp) => {
          if (err) {
             console.error('SFTP Error', err);
             conn.end();
             return;
          }
          
          const remotePath = cwd + '/server.ts';
          console.log('Uploading corrected server.ts to', remotePath);
          
          sftp.fastPut(localServerFile, remotePath, (err) => {
            if (err) {
               console.error('Upload Error', err);
               conn.end();
               return;
            }
            
            console.log('Upload successful! Restarting server...');
            
            conn.exec('pm2 restart ' + fybotApp.pm_id, (err, stream2) => {
              if (err) {
                 console.error('PM2 restart error', err);
                 conn.end();
                 return;
              }
              stream2.on('data', (d) => console.log('PM2:', d.toString()))
                     .on('close', () => {
                       console.log('SUCCESS! Everything is running perfectly.');
                       conn.end();
                     });
            });
          });
        });
      } catch (e) {
        console.error("Failed to parse PM2 output:", e.message);
        conn.end();
      }
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
