const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  console.log("Conectando ao banco de dados...");
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Fybot2026!',
    database: process.env.DB_NAME || 'fybot_db',
  });

  const emails = [
    'jfcn6020@gmail.com',
    'jfcn5020@gmail.com',
    'jfcnaaaa@gmail.com',
    '11111111@gmail.com',
    'jfcn8020@gmail.com',
    'jfcnbbbb@gmail.com',
    'jfcn7020@gmail.com',
    'jfcn4020@gmail.com'
  ];

  try {
    const [result] = await pool.query(`DELETE FROM users WHERE email IN (?)`, [emails]);
    console.log(`\n✅ Sucesso! Foram deletados ${result.affectedRows} usuários diretamente do Banco de Dados.`);
    console.log("Os usuários fantasmas não voltarão mais.");
  } catch (error) {
    console.error("Erro ao deletar:", error.message);
  } finally {
    await pool.end();
  }
}

run();
