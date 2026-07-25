import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Fybot2026!',
  database: process.env.DB_NAME || 'fybot_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function migrateUserStates() {
  console.log('Iniciando migração dos UserStates para o MySQL...');

  try {
    const connection = await pool.getConnection();

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_states (
        userId VARCHAR(255) PRIMARY KEY,
        state_data LONGTEXT
      )
    `);

    const dbPath = path.join(__dirname, '..', 'data', 'db.json');
    if (!fs.existsSync(dbPath)) {
      console.log('db.json não encontrado.');
      connection.release();
      process.exit(0);
    }

    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    if (dbData.userStates) {
      let count = 0;
      for (const [uid, state] of Object.entries(dbData.userStates)) {
        const stateStr = JSON.stringify(state);
        await connection.query(
          `INSERT IGNORE INTO user_states (userId, state_data) VALUES (?, ?)`,
          [uid, stateStr]
        );
        count++;
      }
      console.log(`Migrados ${count} userStates com sucesso!`);
    }

    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

migrateUserStates();
