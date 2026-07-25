const { Client } = require('ssh2');

const conn = new Client();
console.log('⏳ Conectando na sua VPS para instalar o MySQL...');

conn.on('ready', () => {
  console.log('✅ Conexão estabelecida! Iniciando instalação do MySQL (isso pode levar alguns minutos)...');
  
  // Script para instalar o MySQL no Ubuntu sem pedir prompt interativo
  const installCmd = `
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
    
    # Configurando banco e senha
    mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Fybot2026!'; FLUSH PRIVILEGES;"
    mysql -u root -pFybot2026! -e "CREATE DATABASE IF NOT EXISTS fybot_db;"
  `;

  conn.exec(installCmd, (err, stream) => {
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
      console.log('\n🎉 MySQL instalado com SUCESSO na VPS!');
      console.log(' Banco de dados "fybot_db" criado.');
      console.log(' Senha de root definida para: Fybot2026!');
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
