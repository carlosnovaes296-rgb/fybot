const fs = require('fs');
const { Client } = require('ssh2');
const conn = new Client();

const localFiles = [
  { local: 'c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\server.ts', remote: '/root/fybot/server.ts' },
  { local: 'c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\backend\\\\db\\\\mysql.ts', remote: '/root/fybot/backend/db/mysql.ts' },
  { local: 'c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\backend\\\\services\\\\DerivBotEngine.ts', remote: '/root/fybot/backend/services/DerivBotEngine.ts' },
  { local: 'c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\backend\\\\services\\\\DerivConnectionManager.ts', remote: '/root/fybot/backend/services/DerivConnectionManager.ts' }
];

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    let uploaded = 0;
    localFiles.forEach(file => {
      sftp.fastPut(file.local, file.remote, (err) => {
        if (err) throw err;
        console.log(`Arquivo ${file.local} enviado com sucesso!`);
        uploaded++;
        if (uploaded === localFiles.length) {
          conn.exec('cd /root/fybot && pm2 restart fybot', (err, stream) => {
            if (err) throw err;
            let out = '';
            stream.on('close', () => {
              console.log('Build finalizado:\\n' + out);
              conn.end();
            }).on('data', (data) => {
              out += data.toString();
            }).stderr.on('data', (data) => {
              out += data.toString();
            });
          });
        }
      });
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000,
});
