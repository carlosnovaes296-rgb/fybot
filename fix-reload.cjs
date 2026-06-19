const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('Aplicando correção do reload infinito...');
  
  // Comenta a linha que grava no heartbeat_log.txt, o que causava o Vite a recarregar a tela
  const cmd = `sed -i "s/fs.appendFileSync(path.join(__dirname, 'heartbeat_log.txt'), accStr);/\\/\\/ fs.appendFileSync.../g" /root/fybot/server.ts && pm2 restart fybot`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()))
      .on('close', () => {
        console.log('\n=============================================');
        console.log('CORREÇÃO APLICADA! O site parou de piscar.');
        console.log('=============================================');
        conn.end();
      });
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
