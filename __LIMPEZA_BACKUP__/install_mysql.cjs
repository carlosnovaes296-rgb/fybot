const { Client } = require('ssh2');

console.log('Conectando na VPS para instalar o MySQL...');

const conn = new Client();
conn.on('ready', () => {
  console.log('Conexão estabelecida! Iniciando instalação (isso pode demorar cerca de 1 a 2 minutos)...');
  
  const commands = `
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y mysql-server
    mysql -e "CREATE DATABASE IF NOT EXISTS fybot_db;"
    mysql -e "CREATE USER IF NOT EXISTS 'fybot_user'@'localhost' IDENTIFIED BY 'fybot_pass_2026';"
    mysql -e "GRANT ALL PRIVILEGES ON fybot_db.* TO 'fybot_user'@'localhost';"
    mysql -e "FLUSH PRIVILEGES;"
    mysql -e "USE fybot_db; CREATE TABLE IF NOT EXISTS fybot_data (id INT PRIMARY KEY AUTO_INCREMENT, data JSON);"
    
    # Adicionar variavel no env
    cd /root/fybot
    echo 'MYSQL_URL="mysql://fybot_user:fybot_pass_2026@localhost:3306/fybot_db"' > .env
    
    # Reiniciar o painel
    pm2 restart fybot
  `;

  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Instalação concluída com sucesso!');
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('Erro na conexão:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H'
});
