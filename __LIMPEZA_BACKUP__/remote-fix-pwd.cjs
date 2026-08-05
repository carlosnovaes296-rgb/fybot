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
      let changed = false;
      dbData.users.forEach(u => {
        if (u.email === "carlosnovaes296@gmail.com") {
          u.password = "password123";
          changed = true;
        }
      });
      if (changed) {
        await pool.execute('UPDATE fybot_data SET data = ? WHERE id = 1', [JSON.stringify(dbData)]);
        console.log("SENHA RESETADA COM SUCESSO NO SERVIDOR!");
      } else {
        console.log("Usuário não encontrado.");
      }
    }
    pool.end();
  } catch(e) {
    console.error("Erro remoto:", e.message);
  }
}
run();
`;

conn.on('ready', () => {
  console.log('Conectado à VPS...');
  conn.exec(`cat << 'EOF' > /root/fybot/fix-pwd.js\n${remoteScript}\nEOF\ncd /root/fybot && node fix-pwd.js`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d))
          .on('close', () => conn.end());
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
