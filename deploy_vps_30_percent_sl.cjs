const fs = require('fs');
const { Client } = require('ssh2');
const conn = new Client();

const localFile = 'c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\backend\\\\services\\\\DerivConnectionManager.ts';
const remoteFile = '/root/fybot/backend/services/DerivConnectionManager.ts';

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(localFile, remoteFile, (err) => {
      if (err) throw err;
      console.log('Arquivo enviado com sucesso!');
      conn.exec('cd /root/fybot && npm run build && pm2 restart fybot', (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('close', () => {
          console.log('Comando finalizado:\\n' + out);
          conn.end();
        }).on('data', (data) => {
          out += data.toString();
        }).stderr.on('data', (data) => {
          out += data.toString();
        });
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
