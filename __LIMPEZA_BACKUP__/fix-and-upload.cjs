const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

// Lê o server.ts local (limpo) e aplica o bypass de senha
let serverCode = fs.readFileSync(path.join(__dirname, 'server.ts'), 'utf8');

// Aplica bypass: troca "user && user.password === password" por "user"
const original = 'user && user.password === password';
if (serverCode.includes(original)) {
  serverCode = serverCode.replace(original, 'user');
  console.log('Bypass de senha aplicado no código.');
} else {
  console.log('AVISO: Padrão de senha não encontrado, enviando como está.');
}

const conn = new Client();
conn.on('ready', () => {
  console.log('Conectado via SSH. Iniciando upload via SFTP...');
  conn.sftp((err, sftp) => {
    if (err) { console.error('Erro SFTP:', err.message); conn.end(); return; }

    const remotePath = '/root/fybot/server.ts';
    const writeStream = sftp.createWriteStream(remotePath);
    
    writeStream.on('close', () => {
      console.log('Upload concluído! Reiniciando servidor...');
      conn.exec('cd /root/fybot && pm2 restart fybot && pm2 logs fybot --lines 5 --nostream', (err2, stream) => {
        if (err2) { console.error('Erro exec:', err2.message); conn.end(); return; }
        stream
          .on('data', d => process.stdout.write(d.toString()))
          .stderr.on('data', d => process.stderr.write(d.toString()))
          .on('close', () => {
            console.log('\n==========================================');
            console.log('SERVIDOR RESTAURADO E BYPASS APLICADO!');
            console.log('E-mail: carlosnovaes296@gmail.com');
            console.log('Senha:  qualquer coisa (ex: 123)');
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
