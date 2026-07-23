const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'fybot-do-user-15875883-0.c.db.ondigitalocean.com',
      user: 'doadmin',
      password: 'AVNS_Q4N7wH9jQ8z0L20rD1S',
      database: 'fybot_db',
      port: 25060,
      ssl: { rejectUnauthorized: false }
    });

    const [rows] = await conn.execute('SELECT data FROM fybot_data WHERE id = 1');
    if (rows.length > 0) {
      let dbData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      const carlos = dbData.users.find(u => u.email === 'carlosnovaes296@gmail.com');
      console.log('--- DADOS DO CARLOS NO BANCO ---');
      console.log(JSON.stringify(carlos, null, 2));
      
      console.log('--- LISTA DE USUARIOS ---');
      console.log(dbData.users.map(u => ({ id: u.id, email: u.email })));
      
      fs.writeFileSync('DADOS_BANCO.txt', JSON.stringify(dbData, null, 2));
    }
    
    await conn.end();
  } catch(e) {
    console.error(e);
  }
}
run();
