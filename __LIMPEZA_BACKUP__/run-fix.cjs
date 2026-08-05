
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
