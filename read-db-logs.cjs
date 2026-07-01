const mysql = require('mysql2/promise');

async function checkLogs() {
  console.log("Conectando ao banco de dados...");
  try {
    const dbUrl = 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-jun-30-backup-do-user-36307313-0.g.db.ondigitalocean.com:25060/defaultdb?ssl={"rejectUnauthorized":false}';
    const conn = await mysql.createConnection(dbUrl);
    
    const [rows] = await conn.execute('SELECT data FROM fybot_data WHERE id = 1');
    if (rows.length > 0) {
      let dbData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      
      const jfcn = dbData.users.find(u => u.email === 'jfcn2020@gmail.com');
      if (jfcn) {
        console.log(`\n=== LOGS DA CONTA ${jfcn.email} (ID: ${jfcn.id}) ===`);
        const state = dbData.userStates[jfcn.id] || dbData.userStates["1"];
        if (state && state.logs) {
          // Pega os ultimos 15 logs
          state.logs.slice(-15).forEach(log => console.log(log));
        } else {
          console.log("Nenhum log encontrado para este usuario.");
        }
      } else {
        console.log("Usuario jfcn2020@gmail.com não encontrado no banco.");
      }
    } else {
      console.log("Tabela fybot_data vazia.");
    }
    
    await conn.end();
  } catch(e) {
    console.error("Erro:", e);
  }
}

checkLogs();
