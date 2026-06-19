const mysql = require('mysql2/promise');
const url = 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-do-user-36307313-0.a.db.ondigitalocean.com:25060/defaultdb?ssl={"rejectUnauthorized":false}';

async function run() {
  try {
    console.log("Conectando direto no Banco de Dados...");
    const pool = mysql.createPool(url);
    const [rows] = await pool.execute('SELECT data FROM fybot_data WHERE id = 1');
    let dbData = {};
    if (rows.length > 0) {
      dbData = JSON.parse(rows[0].data);
    }
    
    dbData.users = [
      { id: '1', name: 'Admin', email: 'admin@fybot.com', password: '123', status: 'ACTIVE', role: 'ADMIN', wallet: '', paymentWallet: '', referralCode: 'ADMIN' }
    ];

    console.log("Salvando nova conta...");
    await pool.execute('INSERT INTO fybot_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = ?', [JSON.stringify(dbData), JSON.stringify(dbData)]);
    
    console.log("===================================");
    console.log("=== SISTEMA RESETADO COM SUCESSO ===");
    console.log("Pode entrar agora no painel com:");
    console.log("E-mail: admin@fybot.com");
    console.log("Senha: 123");
    console.log("===================================");
    
    pool.end();
  } catch(e) {
    console.error("Erro:", e.message);
  }
}
run();
