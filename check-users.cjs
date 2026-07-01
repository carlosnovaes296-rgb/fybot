const { Client } = require('ssh2');
const conn = new Client();

const remoteScript = `
const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  try {
    const dbUrl = 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-do-user-36307313-0.a.db.ondigitalocean.com:25060/defaultdb?ssl={"rejectUnauthorized":false}';
    console.log("Conectando ao banco de dados...");
    const conn = await mysql.createConnection(dbUrl);
    console.log("Conexao bem sucedida!");
    
    const [rows] = await conn.execute('SELECT data FROM fybot_data WHERE id = 1');
    if (rows.length > 0 && rows[0].data) {
      let dbData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      console.log("==> TOTAL DE USUARIOS NO MYSQL DA DIGITALOCEAN: " + (dbData.users ? dbData.users.length : 0));
      if (dbData.users) {
        dbData.users.slice(0, 5).forEach(u => console.log("- " + u.email));
      }
    } else {
      console.log("Banco VAZIO ou sem dados em fybot_data.");
    }
    await conn.end();
  } catch (err) {
    console.error("ERRO REMOTO:", err.message);
  }
}
run();
`;

conn.on('ready', () => {
  console.log("Conectado ao VPS. Executando busca no banco...");
  conn.exec(`cat << 'EOF' > /root/fybot/check-users.cjs\n${remoteScript}\nEOF\ncd /root/fybot && node check-users.cjs`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      console.log("Busca concluída.");
      conn.end();
    });
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
