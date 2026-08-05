const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const localFile = path.join(__dirname, '.env');
const remoteFile = '/root/fybot/.env';

conn.on('ready', () => {
  console.log('✅ SSH Connected. Enviando o arquivo .env atualizado...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    sftp.fastPut(localFile, remoteFile, (err) => {
      if (err) { console.error(`❌ Erro ao enviar .env:`, err); conn.end(); return; }
      
      console.log('✅ .env enviado com sucesso!');
      console.log('Restarting PM2 server on VPS with --update-env...');
      conn.exec('/usr/lib/node_modules/pm2/bin/pm2 restart fybot --update-env', (err, stream) => {
        if (err) { console.error(err); conn.end(); return; }
        stream.on('data', d => process.stdout.write(d))
              .stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => {
          console.log('\n🎉 Variáveis de ambiente atualizadas no VPS!');
          conn.end();
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
