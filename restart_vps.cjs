const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS.');
  
  // Script para matar processos zumbis na porta 3000 e iniciar o PM2 limpo
  const commands = [
    'echo "🧹 Matando processo zumbi na porta 3000..."',
    'fuser -k 3000/tcp || kill -9 $(lsof -t -i:3000) || kill -9 $(netstat -tlpn | grep :3000 | awk \'{print $7}\' | cut -d\'/\' -f1) || true',
    'sleep 2',
    'echo "🚀 Iniciando o PM2 limpo..."',
    'pm2 delete all || true',
    'cd /root/fybot && pm2 start server.ts --name "fybot"',
    'pm2 save',
    'echo "📊 Status do PM2 pós-início:"',
    'pm2 status'
  ].join(' && ');

  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('\n=============================================');
      console.log('🎉 REINICIALIZAÇÃO COMPLETA CONCLUÍDA! 🎉');
      console.log('=============================================');
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
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
