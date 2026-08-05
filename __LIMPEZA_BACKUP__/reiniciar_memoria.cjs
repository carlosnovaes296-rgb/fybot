require('dotenv').config();
const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado ao VPS. Reiniciando o servidor para aplicar a limpeza de usuários...');
  conn.exec('pm2 restart fybot', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('✅ Servidor reiniciado com sucesso! A memória foi atualizada.');
      conn.end();
      process.exit(0);
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
