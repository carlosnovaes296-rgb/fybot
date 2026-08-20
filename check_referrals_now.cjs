const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [users] = await connection.execute('SELECT id, name, email, referralCode, referredBy FROM users');
  console.log('Total users:', users.length);
  
  // See who refers who
  const referralCounts = {};
  users.forEach(u => {
    if (u.referredBy) {
      referralCounts[u.referredBy] = (referralCounts[u.referredBy] || 0) + 1;
    }
  });
  console.log('Referral counts:', referralCounts);
  
  // Find ADMIN
  const admin = users.find(u => u.id === '1' || u.name.toLowerCase().includes('admin'));
  console.log('Admin:', admin);

  await connection.end();
}

check().catch(console.error);
