const mysql = require('mysql2/promise');

async function clean() {
  const pool = mysql.createPool(process.env.MYSQL_URL || 'mysql://doadmin:REDACTED@db-mysql-nyc1-24958-do-user-17637841-0.c.db.ondigitalocean.com:25060/defaultdb?ssl={"rejectUnauthorized":false}');
  
  try {
    const [rows] = await pool.query('SELECT * FROM user_states');
    console.log(`Found ${rows.length} states`);
    
    let updated = 0;
    for (const row of rows) {
      if (row.state_data) {
        let stateData = typeof row.state_data === 'string' ? JSON.parse(row.state_data) : row.state_data;
        if (stateData.trades) {
          const originalLen = stateData.trades.length;
          stateData.trades = stateData.trades.filter(t => String(t.id) !== '1799644219');
          
          if (stateData.trades.length !== originalLen) {
            console.log(`Removing from user ${row.userId}`);
            await pool.query('UPDATE user_states SET state_data = ? WHERE userId = ?', [JSON.stringify(stateData), row.userId]);
            updated++;
          }
        }
      }
    }
    console.log(`Updated ${updated} users`);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
clean();
