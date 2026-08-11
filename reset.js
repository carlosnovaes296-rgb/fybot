const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function resetDB() {
    const pool = mysql.createPool(process.env.MYSQL_URL + '?ssl={"rejectUnauthorized":false}');
    
    try {
        console.log('Clearing referral_earnings...');
        await pool.query('TRUNCATE TABLE referral_earnings');
        
        console.log('Clearing withdrawals...');
        await pool.query('TRUNCATE TABLE withdrawals');
        
        console.log('Clearing payments...');
        await pool.query('TRUNCATE TABLE payments');
        
        console.log('Clearing licenses (except admin)...');
        await pool.query('DELETE FROM licenses WHERE userId != "1"');
        
        // Remove retroactive hack from db.json if it exists
        const dbPath = path.join(__dirname, 'data', 'db.json');
        if (fs.existsSync(dbPath)) {
            const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            data.referralEarnings = [];
            data.withdrawals = [];
            data.payments = [];
            data.licenses = (data.licenses || []).filter(l => l.userId === '1');
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        }

        console.log('SUCCESS: All test data has been reset to zero.');
    } catch (e) {
        console.error('Error resetting DB:', e);
    } finally {
        pool.end();
    }
}

resetDB();
