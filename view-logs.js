import { Client } from 'ssh2';

const conn = new Client();

console.log('⏳ Conectando à VPS para ler os logs do Fybot...');

conn.on('ready', () => {
  console.log('✅ SSH Conectado! Lendo logs em tempo real (Pressione Ctrl+C para sair):\n');
  
  // O comando "pm2 logs fybot" mostra os logs e fica assistindo (streaming)
  conn.exec('pm2 logs fybot', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', () => {
      console.log('\n❌ Conexão de logs encerrada.');
      conn.end();
    }).on('data', (data) => {
      // Exibe os logs normais no terminal
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      // Exibe os erros no terminal
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('Erro de SSH: ' + err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
