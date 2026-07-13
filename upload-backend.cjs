const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const localFile = path.join(__dirname, 'server.ts');
const remoteFile = '/root/fybot/server.ts';

conn.on('ready', () => {
  console.log('✅ SSH Connected. Uploading server.ts...');
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP error:', err); conn.end(); return; }
    
    sftp.fastPut(localFile, remoteFile, (err) => {
      if (err) {
        console.error(`❌ Erro ao enviar server.ts:`, err);
        conn.end();
        return;
      }
      
      console.log('✅ server.ts enviado com sucesso!');
      console.log('Restarting PM2 server on VPS...');
      conn.exec('/usr/lib/node_modules/pm2/bin/pm2 restart fybot', (err, stream) => {
        if (err) { console.error(err); conn.end(); return; }
        let out = '';
        stream.on('data', d => { out += d; process.stdout.write(d); })
              .stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => {
          console.log('\n🎉 Backend atualizado com sucesso no servidor VPS!');
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
