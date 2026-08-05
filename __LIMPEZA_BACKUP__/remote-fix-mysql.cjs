const { Client } = require('ssh2');
const fs = require('fs');

const fixScriptContent = `
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: '/root/fybot/.env' });

async function run() {
  try {
    const dbUrl = process.env.MYSQL_URL;
    if (!dbUrl) {
      throw new Error("MYSQL_URL não encontrada no arquivo .env");
    }

    console.log("Conectando ao banco de dados com a URL do servidor...");
    const conn = await mysql.createConnection(dbUrl + '?ssl={"rejectUnauthorized":false}');

    const data = fs.readFileSync('/root/fybot/data/db.json', 'utf8');
    
    // Testa o parse antes de injetar
    JSON.parse(data);

    await conn.execute('UPDATE fybot_data SET data = ? WHERE id = 1', [data]);
    console.log("Banco MySQL corrigido com sucesso via Droplet!");
    await conn.end();
  } catch (err) {
    console.error("Erro no MySQL interno:", err);
  }
}
run();
`;

fs.writeFileSync('./run-fix.cjs', fixScriptContent);

const conn = new Client();
conn.on('ready', () => {
  console.log('Conectado ao servidor via SSH. Fazendo upload...');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    sftp.fastPut('./data/db.json', '/root/fybot/data/db.json', (err) => {
      if (err) throw err;
      
      sftp.fastPut('./run-fix.cjs', '/root/fybot/run-fix.cjs', (err) => {
        if (err) throw err;
        
        console.log('Uploads concluidos! Executando a correção usando as credenciais oficiais do servidor...');
        
        conn.exec('cd /root/fybot && npm install dotenv mysql2 && node run-fix.cjs && pm2 restart fybot', (err, stream) => {
          if (err) throw err;
          stream.on('close', (code, signal) => {
            console.log('Correção finalizada!');
            conn.end();
          }).on('data', (data) => {
            process.stdout.write(data);
          }).stderr.on('data', (data) => {
            process.stderr.write(data);
          });
        });
      });
    });
  });

}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
