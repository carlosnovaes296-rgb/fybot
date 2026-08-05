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

    console.log('Limpando o historico velho de licencas (mantendo as ATIVAS)...');
    // Remove qualquer licença que não seja a ativa (ex: UPGRADED, EXPIRED, INACTIVE, CANCELED)
    const [result] = await connection.execute('DELETE FROM licenses WHERE status != "ACTIVE"');
    
    console.log(`Sucesso! ${result.affectedRows} licencas antigas foram removidas da tabela.`);
    process.exit(0);
  } catch (error) {
    console.error('Erro ao limpar licencas:', error);
    process.exit(1);
  }
}

run();
