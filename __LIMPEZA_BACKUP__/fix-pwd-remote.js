const mysql = require('mysql2/promise');
const url = process.env.MYSQL_URL;

if (!url) {
  console.error('MYSQL_URL não encontrada no ambiente!');
  process.exit(1);
}

async function run() {
  console.log("Conectando ao banco...");
  const pool = mysql.createPool(url + '?ssl={"rejectUnauthorized":false}');
  
  try {
    const [rows] = await pool.execute('SELECT data FROM fybot_data WHERE id = 1');
    
    let dbData = {};
    if (rows.length > 0 && rows[0].data) {
      dbData = JSON.parse(rows[0].data);
    }

    if (!dbData.users) dbData.users = [];
    
    // Mostra senhas atuais
    console.log("=== USUÁRIOS ATUAIS ===");
    dbData.users.forEach(u => console.log(`Email: ${u.email} | Senha: ${u.password}`));
    
    // Remove e recria o Carlos com nova senha
    dbData.users = dbData.users.filter(u => u.email !== 'carlosnovaes296@gmail.com');
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
    console.log("SENHA ATUALIZADA COM SUCESSO!");
    console.log("E-mail:  carlosnovaes296@gmail.com");
    console.log("Senha:   fybot2026");
    console.log("=========================================");
    
    await pool.end();
  } catch(e) {
    console.error("Erro:", e.message);
    await pool.end();
  }
}
run();
