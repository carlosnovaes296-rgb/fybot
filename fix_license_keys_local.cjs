const mysql = require('mysql2/promise');

async function fixKeys() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: 'fybot_db'
  });

  try {
    const [rows] = await connection.execute('SELECT id, userId, `key` FROM licenses WHERE `key` IS NULL OR `key` = ""');
    console.log(`Found ${rows.length} licenses without a key.`);
    
    for (const row of rows) {
      const newKey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
      await connection.execute('UPDATE licenses SET `key` = ? WHERE id = ?', [newKey, row.id]);
      console.log(`Updated license ${row.id} for user ${row.userId} with key ${newKey}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

fixKeys();
