const { Client } = require('ssh2');
const conn = new Client();
const config = {
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
};

conn.on('ready', () => {
  // Executando um pequeno script Node.js na VPS para ler o log do usuario 1jsleiedp ou do banco todo
  const remoteScript = `
    const mysql = require('mysql2/promise');
    async function run() {
      const dbUrl = 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-jun-30-backup-do-user-36307313-0.g.db.ondigitalocean.com:25060/defaultdb?ssl={"rejectUnauthorized":false}';
      const conn = await mysql.createConnection(dbUrl);
      const [rows] = await conn.execute('SELECT data FROM fybot_data WHERE id = 1');
      if (rows.length > 0) {
        let dbData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        const jfcn = dbData.users.find(u => u.email === 'jfcn2020@gmail.com');
        if (jfcn) {
          console.log("=== LOGS DO USUARIO ===");
          const state = dbData.userStates[jfcn.id] || dbData.userStates["1"];
          if (state && state.logs) {
            console.log(state.logs.slice(-10));
          } else {
            console.log("Sem logs no state para o id", jfcn.id);
          }
        }
      }
      await conn.end();
    }
    run().catch(console.error);
  `;
  
  conn.exec(`node -e "${remoteScript.replace(/"/g, '\\"')}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect(config);
