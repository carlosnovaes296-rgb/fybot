const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  try {
    console.log("Conectando ao banco de dados...");
    const conn = await mysql.createConnection({
      host: 'fybot-do-user-15875883-0.c.db.ondigitalocean.com',
      user: 'doadmin',
      password: 'AVNS_Q4N7wH9jQ8z0L20rD1S',
      database: 'fybot_db',
      port: 25060,
      ssl: { rejectUnauthorized: false }
    });

    const localData = fs.readFileSync('./data/db.json', 'utf8');
    
    // Validate JSON to make sure we don't upload [object Object] again
    JSON.parse(localData);

    console.log("JSON validado. Substituindo dados corrompidos...");
    
    await conn.execute(
      'UPDATE fybot_data SET data = ? WHERE id = 1',
      [localData]
    );

    console.log("Dados corrigidos com sucesso! Pode reiniciar o servidor agora.");
    await conn.end();
  } catch (err) {
    console.error("Erro:", err);
  }
}

run();
