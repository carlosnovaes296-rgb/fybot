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

async function migrate() {
  console.log('Iniciando migração do db.json para MySQL...');

  try {
    const connection = await pool.getConnection();

    // 1. Criar Tabelas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        wallet VARCHAR(255),
        paymentWallet VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        role VARCHAR(50) DEFAULT 'USER',
        referredBy VARCHAR(255),
        derivToken VARCHAR(255),
        derivTokenDemo VARCHAR(255),
        derivTokenReal VARCHAR(255),
        activeAccountType VARCHAR(50) DEFAULT 'DEMO',
        createdAt DATETIME
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255),
        license_key VARCHAR(255),
        type VARCHAR(50),
        status VARCHAR(50),
        expiryDate DATETIME
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255),
        amount DECIMAL(10,2),
        method VARCHAR(50),
        hash VARCHAR(255),
        status VARCHAR(50),
        createdAt DATETIME
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255),
        userName VARCHAR(255),
        userEmail VARCHAR(255),
        amount DECIMAL(10,2),
        wallet VARCHAR(255),
        status VARCHAR(50),
        createdAt DATETIME
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS trade_settings (
        userId VARCHAR(255) PRIMARY KEY,
        strategy VARCHAR(50),
        dailyTarget DECIMAL(10,2),
        stopLoss DECIMAL(10,2),
        entryAmount DECIMAL(10,2),
        martingaleType VARCHAR(50),
        martingaleMultiplier DECIMAL(10,2),
        maxMartingales INT,
        sorosGale BOOLEAN
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS config (
        id INT PRIMARY KEY DEFAULT 1,
        globalTarget DECIMAL(10,2),
        masterWallet VARCHAR(255),
        botActive BOOLEAN DEFAULT true,
        isMaintenance BOOLEAN DEFAULT false
      )
    `);

    // 2. Ler db.json
    const dbPath = path.join(__dirname, '..', 'data', 'db.json');
    if (!fs.existsSync(dbPath)) {
      console.log('db.json não encontrado. Tabelas criadas vazias.');
      connection.release();
      process.exit(0);
    }

    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    // 3. Migrar Dados
    if (dbData.users) {
      for (const u of dbData.users) {
        await connection.query(
          `INSERT IGNORE INTO users (id, name, email, password, wallet, paymentWallet, status, role, referredBy, derivToken, derivTokenDemo, derivTokenReal, activeAccountType, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.id, u.name, u.email, u.password, u.wallet || '', u.paymentWallet || '', u.status || 'PENDING', u.role || 'USER', u.referredBy || '', u.derivToken || '', u.derivTokenDemo || '', u.derivTokenReal || '', u.activeAccountType || 'DEMO', new Date(u.createdAt || Date.now())]
        );
      }
      console.log(`Migrados ${dbData.users.length} usuários.`);
    }

    if (dbData.licenses) {
      for (const l of dbData.licenses) {
        await connection.query(
          `INSERT IGNORE INTO licenses (id, userId, license_key, type, status, expiryDate) VALUES (?, ?, ?, ?, ?, ?)`,
          [l.id, l.userId, l.key, l.type, l.status, new Date(l.expiryDate)]
        );
      }
      console.log(`Migradas ${dbData.licenses.length} licenças.`);
    }

    if (dbData.payments) {
      for (const p of dbData.payments) {
        await connection.query(
          `INSERT IGNORE INTO payments (id, userId, amount, method, hash, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.userId, p.amount, p.method, p.hash, p.status, new Date(p.createdAt || Date.now())]
        );
      }
      console.log(`Migrados ${dbData.payments.length} pagamentos.`);
    }

    if (dbData.withdrawals) {
      for (const w of dbData.withdrawals) {
        await connection.query(
          `INSERT IGNORE INTO withdrawals (id, userId, userName, userEmail, amount, wallet, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [w.id, w.userId, w.userName || '', w.userEmail || '', w.amount, w.wallet, w.status, new Date(w.timestamp || Date.now())]
        );
      }
      console.log(`Migrados ${dbData.withdrawals.length} saques.`);
    }

    if (dbData.tradeSettings) {
        for (const [uid, ts] of Object.entries(dbData.tradeSettings)) {
            const settings: any = ts;
            await connection.query(
                `INSERT IGNORE INTO trade_settings (userId, strategy, dailyTarget, stopLoss, entryAmount, martingaleType, martingaleMultiplier, maxMartingales, sorosGale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [uid, settings.strategy, settings.dailyTarget, settings.stopLoss, settings.entryAmount, settings.martingaleType, settings.martingaleMultiplier, settings.maxMartingales, settings.sorosGale ? 1 : 0]
            );
        }
        console.log(`Migradas configurações de trade.`);
    }

    console.log('Migração concluída com sucesso!');
    connection.release();
    process.exit(0);

  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

migrate();
