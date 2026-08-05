import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Conectando ao banco de dados...');
  try {
    let connection;
    if (process.env.MYSQL_URL) {
        connection = await mysql.createConnection(process.env.MYSQL_URL + '?ssl={"rejectUnauthorized":false}');
    } else {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || 'Fybot2026!',
            database: process.env.DB_NAME || 'fybot_db',
        });
    }

    console.log('Buscando todas as licenças ativas...');
    const [rows] = await connection.execute('SELECT * FROM licenses WHERE status = "ACTIVE"');
    const licenses = rows;

    console.log(`Encontradas ${licenses.length} licencas ativas. Reajustando as datas a partir de HOJE...`);

    let updated = 0;
    for (const lic of licenses) {
      let days = 30; // padrão
      let type = (lic.type || '').toUpperCase();
      
      // Aplicando exatamente as regras acordadas
      if (type.includes('BÁSICA') || type.includes('BASIC')) days = 30;
      else if (type === 'PRO' || type.includes('PRO')) days = 60;
      
      // Sobrescreve se for um plano maior
      if (type.includes('INSTITUCIONAL') || type.includes('PARTNER')) days = 90;
      if (type.includes('BOT PRO') || type.includes('ENTERPRISE') || type.includes('180')) days = 180;
      if (type.includes('LIFETIME') || type.includes('VITALÍCIO') || type.includes('VITALICIO')) days = 36500; // Vitalício

      // Calcula a nova data com base em hoje
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + days);

      await connection.execute('UPDATE licenses SET expiryDate = ? WHERE id = ?', [newExpiry, lic.id]);
      updated++;
      console.log(`[OK] Licenca ID: ${lic.id} | Tipo: ${type} -> Vencimento ajustado para ${days} dias (${newExpiry.toISOString().split('T')[0]})`);
    }

    console.log(`Sucesso! ${updated} licencas foram atualizadas.`);
    process.exit(0);
  } catch (error) {
    console.error('Erro ao reajustar licencas:', error);
    process.exit(1);
  }
}

run();
