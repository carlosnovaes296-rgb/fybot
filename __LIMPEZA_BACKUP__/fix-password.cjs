const mysql = require('mysql2/promise');

const url = process.env.MYSQL_URL || 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-do-user-36307313-0.a.db.ondigitalocean.com:25060/defaultdb';

async function run() {
  console.log("Conectando ao banco de dados MySQL da DigitalOcean...");
  const pool = mysql.createPool(url + '?ssl={"rejectUnauthorized":false}');
  
  try {
    // Verifica se tabela existe
    const [rows] = await pool.execute('SELECT data FROM fybot_data WHERE id = 1');
    console.log("Leitura OK. Registros encontrados:", rows.length);
    
    let dbData = {};
    if (rows.length > 0 && rows[0].data) {
      dbData = JSON.parse(rows[0].data);
      console.log("Usuários no banco:", dbData.users ? dbData.users.map(u => u.email).join(', ') : 'nenhum');
    }

    // Garante que o usuário carlosnovaes296@gmail.com com senha password123 existe
    if (!dbData.users) dbData.users = [];
    
    // Remove usuário existente com este email
    dbData.users = dbData.users.filter(u => u.email !== 'carlosnovaes296@gmail.com');
    
    // Adiciona/atualiza com senha nova
    dbData.users.unshift({
      id: '1',
      name: 'Carlos Novaes',
      email: 'carlosnovaes296@gmail.com',
      password: 'fybot2026',
      status: 'ACTIVE',
      role: 'ADMIN',
      wallet: '0x883a831511a1b71b4920cd32d3694ecef432b585',
      paymentWallet: '0x883a831511a1b71b4920cd32d3694ecef432b585',
      referralCode: 'CARLOS296',
      createdAt: new Date().toISOString()
    });

    const jsonStr = JSON.stringify(dbData);
    await pool.execute(
      'INSERT INTO fybot_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = ?',
      [jsonStr, jsonStr]
    );
    
    console.log("");
    console.log("=========================================");
    console.log("✅ SENHA ATUALIZADA COM SUCESSO NO BANCO!");
    console.log("=========================================");
    console.log("E-mail:  carlosnovaes296@gmail.com");
    console.log("Senha:   fybot2026");
    console.log("=========================================");
    console.log("");
    console.log("Agora reinicie o servidor com: node restart-vps.cjs");
    
    await pool.end();
  } catch (e) {
    console.error("ERRO:", e.message);
    await pool.end();
  }
}
run();
