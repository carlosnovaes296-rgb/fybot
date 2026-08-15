const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const conn = new Client();

console.log('◇ injected env (12) from .env // tip: ⌘ auth for agents [www.vestauth.com]');
console.log('🔄 Conectando à VPS para enviar os arquivos...');

conn.on('ready', () => {
  console.log('✅ Connected to VPS.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    const localPath = path.join(__dirname, 'server.ts');
    const remotePath = '/root/fybot/server.ts';
    const localEngine = path.join(__dirname, 'backend/services/DerivBotEngine.ts');
    const remoteEngine = '/root/fybot/backend/services/DerivBotEngine.ts';
    
    console.log(`📤 Enviando ${localPath} -> ${remotePath}...`);
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) {
        console.error('❌ Erro no envio server:', err.message);
        conn.end();
        return;
      }
      
      console.log(`📤 Enviando ${localEngine} -> ${remoteEngine}...`);
      sftp.fastPut(localEngine, remoteEngine, (err) => {
        if (err) {
          console.error('❌ Erro no envio engine:', err.message);
          conn.end();
          return;
        }
        
        console.log('✅ Arquivos enviados com sucesso!');
        console.log('🔄 Reiniciando o servidor (PM2)...');
        
        conn.exec('cd /root/fybot && pm2 start npm --name "fybot" -- run start', (err, stream) => {
          if (err) throw err;
          stream.on('close', (code, signal) => {
            console.log('✅ Servidor reiniciado com a nova correção!');
            conn.end();
          }).on('data', (data) => {
            console.log(data.toString());
          }).stderr.on('data', (data) => {
            console.error(data.toString());
          });
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('❌ Connection Error:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
