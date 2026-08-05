const { Client } = require('ssh2');

const conn = new Client();
console.log('⏳ Conectando na sua VPS para iniciar a migração dos dados...');

conn.on('ready', () => {
  console.log('✅ Conexão estabelecida! Iniciando migração do db.json para o MySQL...');
  
  // Executando o script de migração que acabamos de enviar
  const cmd = "cd /root/fybot && npx tsx backend/migrate-mysql.ts";

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Erro ao executar comandos:', err);
      conn.end();
      return;
    }
    
    stream.on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    stream.on('close', () => {
      console.log('\n🎉 O banco de dados foi perfeitamente migrado para o MySQL!');
      conn.end();
    });
  });
}).on('error', (err) => {
  console.error('❌ Erro na conexão SSH:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
