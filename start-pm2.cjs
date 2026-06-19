const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('Restaurando servidor...');
  // Tenta iniciar com tsx e nome fybot
  conn.exec(`cd /root/fybot && npm install && npm run build && pm2 start npm --name fybot -- run start`, (err, stream) => {
    if (err) throw err;
    stream
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()))
      .on('close', () => {
        console.log('\n==========================================');
        console.log('PROCESSO FYBOT INICIADO NO PM2!');
        console.log('Tente acessar http://209.97.163.75:3000 novamente.');
        console.log('==========================================');
        conn.end();
      });
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
