const { Client } = require('ssh2');
const conn = new Client();

const remoteScript = `
const mysql = require('mysql2/promise');

async function run() {
  try {
    const dbUrl = 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-do-user-36307313-0.a.db.ondigitalocean.com:25060/defaultdb?ssl={"rejectUnauthorized":false}';
    const conn = await mysql.createConnection(dbUrl);
    
    const [rows] = await conn.execute('SELECT data FROM fybot_data WHERE id = 1');
    if (rows.length > 0 && rows[0].data) {
      let dbData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      if (dbData.users) {
        const user = dbData.users.find(u => u.email === 'jfcn2020@gmail.com');
        if (user) {
          console.log("=== CREDENCIAIS ENCONTRADAS ===");
          console.log("Email:", user.email);
          console.log("Senha:", user.password);
          console.log("ID:", user.id);
          console.log("Role:", user.role);
        } else {
          console.log("ERRO: Usuário jfcn2020@gmail.com não encontrado no banco de dados.");
          console.log("Total de usuários no banco atual:", dbData.users.length);
        }
      }
    } else {
      console.log("ERRO: O banco de dados está VAZIO.");
    }
    await conn.end();
  } catch (err) {
    console.error("ERRO REMOTO:", err.message);
  }
}
run();
`;

conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /root/fybot/get-jfcn.cjs\n${remoteScript}\nEOF\ncd /root/fybot && node get-jfcn.cjs`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      conn.end();
    });
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
