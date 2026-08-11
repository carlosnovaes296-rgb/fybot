const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Fybot2026!',
    database: process.env.DB_NAME || 'fybot_db',
  });

  try {
    // Definir o admin (ID = 1 ou email jfcn2020@gmail.com) como patrocinador de todos os outros!
    console.log("Corrigindo as contas antigas que ficaram órfãs...");
    
    // Procura o ID do Admin
    const [adminRows] = await pool.query('SELECT id, referralCode FROM users WHERE email = ? LIMIT 1', ['jfcn2020@gmail.com']);
    if (adminRows.length === 0) {
      console.log("Admin não encontrado!");
      return;
    }
    const adminId = adminRows[0].id;
    
    // Atualiza todos os usuários (exceto o admin) para terem o admin como patrocinador
    const [updateResult] = await pool.query('UPDATE users SET referredBy = ? WHERE id != ?', [adminId, adminId]);
    
    console.log(`\n✅ Sucesso! Foram corrigidos e vinculados ${updateResult.affectedRows} afiliados à sua rede (Admin).`);
    
  } catch (error) {
    console.error("Erro:", error.message);
  } finally {
    await pool.end();
  }
}

run();
