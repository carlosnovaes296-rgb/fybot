const { Client } = require('ssh2');
const conn = new Client();

const remoteScript = `
const mysql = require('mysql2/promise');
const url = 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-do-user-36307313-0.a.db.ondigitalocean.com:25060/defaultdb?ssl={"rejectUnauthorized":false}';
async function run() {
  try {
    const pool = mysql.createPool(url);
    const [rows] = await pool.execute('SELECT data FROM fybot_data WHERE id = 1');
    let dbData = {};
    if (rows.length > 0) {
      dbData = JSON.parse(rows[0].data);
    }
    
    // Força a criação do admin com senha 123
    dbData.users = [
      { id: '1', name: 'Admin', email: 'admin@fybot.com', password: '123', status: 'ACTIVE', role: 'ADMIN', wallet: '', paymentWallet: '', referralCode: 'ADMIN' }
    ];

    await pool.execute('INSERT INTO fybot_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = ?', [JSON.stringify(dbData), JSON.stringify(dbData)]);
    
    console.log("=== SISTEMA RESETADO ===");
    console.log("E-mail: admin@fybot.com");
    console.log("Senha: 123");
    
    pool.end();
  } catch(e) {
    console.error("Erro:", e.message);
  }
}
run();
`;

conn.on('ready', () => {
  console.log('Aplicando reset definitivo...');
  conn.exec(`cat << 'EOF' > /root/fybot/reset-login.js\n${remoteScript}\nEOF\ncd /root/fybot && node reset-login.js && pm2 restart fybot`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d))
          .on('close', () => conn.end());
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
