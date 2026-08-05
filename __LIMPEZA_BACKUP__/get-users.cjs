const { Client } = require('ssh2');
const conn = new Client();

const remoteScript = `
const mysql = require('mysql2/promise');
const url = 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-do-user-36307313-0.a.db.ondigitalocean.com:25060/defaultdb?ssl={"rejectUnauthorized":false}';
async function run() {
  try {
    const pool = mysql.createPool(url);
    const [rows] = await pool.execute('SELECT data FROM fybot_data WHERE id = 1');
    if (rows.length > 0) {
      let dbData = JSON.parse(rows[0].data);
      console.log("=== LISTA DE USUÁRIOS NO BANCO ===");
      dbData.users.forEach(u => console.log("Email: " + u.email + " | Senha: " + u.password));
    } else {
      console.log("Nenhum dado encontrado no banco.");
    }
    pool.end();
  } catch(e) {
    console.error("Erro:", e.message);
  }
}
run();
`;

conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /root/fybot/get-users.js\n${remoteScript}\nEOF\ncd /root/fybot && node get-users.js`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d))
          .on('close', () => conn.end());
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
