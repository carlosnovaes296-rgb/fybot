const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

// Lê o server.ts local que acabamos de blindar
let serverCode = fs.readFileSync(path.join(__dirname, 'server.ts'), 'utf8');

const conn = new Client();
conn.on('ready', () => {
  console.log('Conectado via SSH. Enviando o novo servidor blindado...');
  conn.sftp((err, sftp) => {
    if (err) { console.error('Erro SFTP:', err.message); conn.end(); return; }

    const remotePath = '/root/fybot/server.ts';
    const writeStream = sftp.createWriteStream(remotePath);
    
    writeStream.on('close', () => {
      console.log('Upload concluído! Reiniciando PM2...');
      conn.exec('cd /root/fybot && pm2 restart fybot', (err2, stream) => {
        if (err2) { console.error('Erro exec:', err2.message); conn.end(); return; }
        stream
          .on('data', d => process.stdout.write(d.toString()))
          .stderr.on('data', d => process.stderr.write(d.toString()))
          .on('close', () => {
            console.log('\n==========================================');
            console.log('LOGIN BLINDADO COM SUCESSO!');
            console.log('Agora ele VAI aceitar qualquer usuário.');
            console.log('==========================================');
            conn.end();
          });
      });
    });

    writeStream.on('error', (e) => {
      console.error('Erro no upload:', e.message);
      conn.end();
    });

    writeStream.write(serverCode);
    writeStream.end();
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
