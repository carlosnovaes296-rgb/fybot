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
    console.log("Calculando comissões retroativas que se perderam enquanto o link estava desatualizado...");
    
    // Pega todos os usuários que estão ativos e que têm um patrocinador
    const [users] = await pool.query("SELECT * FROM users WHERE status = 'ACTIVE' AND referredBy != '' AND referredBy IS NOT NULL");
    const [earnings] = await pool.query("SELECT * FROM referral_earnings");
    const [licenses] = await pool.query("SELECT * FROM licenses WHERE status = 'ACTIVE'");
    
    let recoveredCount = 0;
    
    for (const u of users) {
      // Verifica se o usuário tem licença ativa
      const hasLicense = licenses.some(l => l.userId === u.id);
      if (!hasLicense) continue;
      
      // Verifica se já existe uma comissão paga por este usuário
      const alreadyPaid = earnings.some(e => e.referredEmail === u.email);
      
      if (!alreadyPaid) {
        // Paga a comissão do Nível 1 para o patrocinador direto (apenas 20% de uma licença básica de $50 para compensar)
        const sponsorId = u.referredBy;
        const amount = 10.00; // 20% de $50
        
        const id = 're_retro_' + Math.random().toString(36).substr(2, 9);
        await pool.query(
          "INSERT INTO referral_earnings (id, referrerId, referredName, referredEmail, level, amount, type, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [id, sponsorId, u.name, u.email, 1, amount, `Comissão Recuperada Nível 1`, new Date().toISOString()]
        );
        recoveredCount++;
        console.log(`Comissão de $${amount} recuperada para o patrocinador de ${u.name}`);
      }
    }
    
    console.log(`\n✅ Sucesso! ${recoveredCount} comissões atrasadas foram injetadas no sistema.`);
    
  } catch (error) {
    console.error("Erro:", error.message);
  } finally {
    await pool.end();
  }
}

run();
