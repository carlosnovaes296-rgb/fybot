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
    // 1. Add referralCode column if it doesn't exist
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN referralCode VARCHAR(50) DEFAULT ''`);
      console.log("Coluna referralCode adicionada com sucesso!");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("A coluna referralCode já existe.");
      } else {
        throw e;
      }
    }

    // 2. Generate referralCode for users that don't have one
    const [users] = await pool.query('SELECT id, name, referralCode FROM users');
    let updatedCount = 0;
    
    for (const user of users) {
      if (!user.referralCode || user.referralCode.trim() === '') {
        const pfx = (user.name || '').replace(/[^A-Za-z]/g, "").substring(0, 4).toUpperCase() || 'REF';
        const sfx = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newCode = `${pfx}${sfx}`;
        
        await pool.query('UPDATE users SET referralCode = ? WHERE id = ?', [newCode, user.id]);
        updatedCount++;
      }
    }
    console.log(`\n✅ Sucesso! Foi gerado um código de afiliado para ${updatedCount} usuários antigos.`);

    // 3. (Opcional) Corrigir a indicação órfã recente (associar o ultimo usuario ao admin se necessario)
    // Para simplificar, vou pedir para o usuário testar o cadastro novamente.

  } catch (error) {
    console.error("Erro:", error.message);
  } finally {
    await pool.end();
  }
}

run();
