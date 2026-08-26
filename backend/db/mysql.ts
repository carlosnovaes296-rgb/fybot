import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Fybot2026!',
  database: process.env.DB_NAME || 'fybot_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Users
export async function getUsers() {
    const [rows] = await pool.query('SELECT * FROM users');
    return rows as any[];
}
export async function getUserById(id: string) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    const users = rows as any[];
    return users.length > 0 ? users[0] : undefined;
}
export async function getUserByEmail(email: string) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const users = rows as any[];
    return users.length > 0 ? users[0] : undefined;
}
export async function insertUser(user: any) {
    await pool.query(
        `INSERT INTO users (id, name, email, password, wallet, paymentWallet, status, role, referredBy, referralCode, derivToken, derivTokenDemo, derivTokenReal, activeAccountType, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.id, user.name, user.email, user.password, user.wallet || '', user.paymentWallet || '', user.status || 'PENDING', user.role || 'USER', user.referredBy || '', user.referralCode || '', user.derivToken || '', user.derivTokenDemo || '', user.derivTokenReal || '', user.activeAccountType || 'DEMO', new Date(user.createdAt || Date.now())]
    );
}
export async function updateUser(id: string, updates: any) {
    // If it's a new user from memory array, it might not exist yet.
    // We use REPLACE INTO or INSERT ... ON DUPLICATE KEY UPDATE.
    // For simplicity, since the memory object has everything, we can just insert it.
    await pool.query(
        `INSERT INTO users (id, name, email, password, wallet, paymentWallet, status, role, referredBy, referralCode, derivToken, derivTokenDemo, derivTokenReal, activeAccountType, phone, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         name=VALUES(name), password=VALUES(password), wallet=VALUES(wallet), paymentWallet=VALUES(paymentWallet), status=VALUES(status), role=VALUES(role), referralCode=VALUES(referralCode), referredBy=VALUES(referredBy), derivToken=VALUES(derivToken), derivTokenDemo=VALUES(derivTokenDemo), derivTokenReal=VALUES(derivTokenReal), activeAccountType=VALUES(activeAccountType), phone=VALUES(phone)`,
        [updates.id, updates.name, updates.email, updates.password, updates.wallet || '', updates.paymentWallet || '', updates.status || 'PENDING', updates.role || 'USER', updates.referredBy || '', updates.referralCode || '', updates.derivToken || '', updates.derivTokenDemo || '', updates.derivTokenReal || '', updates.activeAccountType || 'DEMO', updates.phone || '', new Date(updates.createdAt || Date.now())]
    );
}
export async function deleteUser(id: string) {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
}

// Licenses
export async function getLicenses() {
    const [rows] = await pool.query('SELECT * FROM licenses');
    return (rows as any[]).map(row => ({
        id: row.id,
        userId: row.userId,
        key: row.license_key,
        type: row.type,
        status: row.status,
        expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null
    }));
}
export async function getLicenseByKey(key: string) {
    const [rows] = await pool.query('SELECT * FROM licenses WHERE license_key = ?', [key]);
    const licenses = rows as any[];
    if (licenses.length > 0) {
        const row = licenses[0];
        return {
           id: row.id,
           userId: row.userId,
           key: row.license_key,
           type: row.type,
           status: row.status,
           expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null
        };
    }
    return undefined;
}
export async function insertLicense(license: any) {
    await pool.query(
        `INSERT INTO licenses (id, userId, license_key, type, status, expiryDate) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), expiryDate=VALUES(expiryDate), type=VALUES(type)`,
        [license.id, license.userId, license.key || license.license_key, license.type, license.status, new Date(license.expiryDate)]
    );
}
export async function updateLicense(id: string, updates: any) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const values = Object.values(updates);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    await pool.query(`UPDATE licenses SET ${setClause} WHERE id = ?`, [...values, id]);
}
export async function deleteLicense(id: string) {
    await pool.query('DELETE FROM licenses WHERE id = ?', [id]);
}

// Withdrawals
export async function getWithdrawals() {
    const [rows] = await pool.query('SELECT * FROM withdrawals ORDER BY createdAt DESC, id DESC');
    return rows as any[];
}
export async function insertWithdrawal(w: any) {
    await pool.query(
        `INSERT INTO withdrawals (id, userId, userName, userEmail, amount, wallet, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [w.id, w.userId, w.userName || '', w.userEmail || '', w.amount, w.wallet, w.status, new Date(w.timestamp || Date.now())]
    );
}
export async function updateWithdrawal(id: string, status: string) {
    await pool.query(`UPDATE withdrawals SET status = ? WHERE id = ?`, [status, id]);
}
export async function deleteWithdrawal(id: string) {
    await pool.query('DELETE FROM withdrawals WHERE id = ?', [id]);
}

// Payments
export async function getPayments() {
    const [rows] = await pool.query('SELECT * FROM payments ORDER BY createdAt DESC, id DESC');
    return rows as any[];
}
export async function insertPayment(p: any) {
    await pool.query(
        `INSERT INTO payments (id, userId, amount, method, hash, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [p.id, p.userId, p.amount, p.method, p.hash, p.status, new Date(p.createdAt || Date.now())]
    );
}
export async function updatePayment(id: string, status: string) {
    await pool.query(`UPDATE payments SET status = ? WHERE id = ?`, [status, id]);
}
export async function deletePayment(id: string) {
    await pool.query('DELETE FROM payments WHERE id = ?', [id]);
}


// Trade Settings
export async function getTradeSettings(userId: string) {
    const [rows] = await pool.query('SELECT * FROM trade_settings WHERE userId = ?', [userId]);
    const settings = rows as any[];
    return settings.length > 0 ? settings[0] : undefined;
}
export async function updateTradeSettings(userId: string, settings: any) {
    const [existing] = await pool.query('SELECT userId FROM trade_settings WHERE userId = ?', [userId]) as any[];
    if (existing.length > 0) {
        const keys = Object.keys(settings);
        if (keys.length === 0) return;
        const values = Object.values(settings);
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        await pool.query(`UPDATE trade_settings SET ${setClause} WHERE userId = ?`, [...values, userId]);
    } else {
        await pool.query(
            `INSERT INTO trade_settings (userId, strategy, dailyTarget, stopLoss, entryAmount, martingaleType, martingaleMultiplier, maxMartingales, sorosGale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, settings.strategy, settings.dailyTarget, settings.stopLoss, settings.entryAmount, settings.martingaleType, settings.martingaleMultiplier, settings.maxMartingales, settings.sorosGale ? 1 : 0]
        );
    }
}

// User States (Saldos, Logs, Históricos)
export async function getUserStates() {
    const [rows] = await pool.query('SELECT * FROM user_states');
    return rows as any[];
}
export async function saveUserStates(userStates: Record<string, any>) {
    for (const [uid, state] of Object.entries(userStates)) {
        const stateStr = JSON.stringify(state);
        await pool.query(
            `INSERT INTO user_states (userId, state_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE state_data = ?`,
            [uid, stateStr, stateStr]
        );
    }
}

// Referral Earnings
export async function getReferralEarnings() {
    const [rows] = await pool.query('SELECT * FROM referral_earnings');
    return rows as any[];
}
export async function insertReferralEarning(e: any) {
    await pool.query(
        `INSERT INTO referral_earnings (id, referrerId, referredName, referredEmail, level, amount, type, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE referrerId=referrerId`,
        [e.id, e.referrerId, e.referredName, e.referredEmail, e.level, e.amount, e.type, e.timestamp]
    );
}
