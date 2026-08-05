require('dotenv').config();
const mysql = require('mysql2/promise');

async function clean() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || 'Fybot2026!',
        database: process.env.DB_NAME || 'fybot_db'
    });
    
    try {
        console.log("Conectando ao banco de dados...");
        
        // Mantém JCneto (ou administradores) e remove o restante
        const [res] = await pool.query("DELETE FROM users WHERE name != 'JCneto' AND role != 'ADMIN'");
        console.log(`✅ Sucesso! Foram removidos ${res.affectedRows} usuários indesejados.`);
        
        console.log("Limpando licenças vazias se houver...");
        await pool.query("DELETE FROM licenses WHERE userId NOT IN (SELECT id FROM users)");
        
    } catch(e) {
        console.error("Erro ao limpar banco de dados:", e);
    }
    process.exit(0);
}

clean();
