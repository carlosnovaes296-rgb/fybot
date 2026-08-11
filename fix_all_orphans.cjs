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
    console.log("Forçando correção de todos os usuários órfãos...");
    
    // Procura o ID do Admin
    const [adminRows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', ['jfcn2020@gmail.com']);
    if (adminRows.length === 0) {
      console.log("Admin não encontrado!");
      return;
    }
    const adminId = adminRows[0].id;
    
    // Atualiza todos os usuários que não têm patrocinador (ou seja, ficaram órfãos) para o Admin
    const [updateResult] = await pool.query(`
      UPDATE users 
      SET referredBy = ? 
      WHERE (referredBy IS NULL OR referredBy = '' OR referredBy NOT IN (SELECT id FROM (SELECT id FROM users) AS u)) 
      AND id != ?
    `, [adminId, adminId]);
    
    console.log(`\n✅ Sucesso! ${updateResult.affectedRows} afiliados órfãos foram amarrados ao Administrador!`);
    
  } catch (error) {
    console.error("Erro:", error.message);
  } finally {
    await pool.end();
  }
}

run();
