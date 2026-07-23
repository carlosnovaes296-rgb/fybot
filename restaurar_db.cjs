const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'fybot-do-user-15875883-0.c.db.ondigitalocean.com',
      user: 'doadmin',
      password: 'AVNS_Q4N7wH9jQ8z0L20rD1S',
      database: 'fybot_db',
      port: 25060,
      ssl: { rejectUnauthorized: false }
    });

    const [rows] = await conn.execute('SELECT data FROM fybot_data WHERE id = 1');
    if (rows.length > 0) {
      let dbData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      
      const jcnetoExists = dbData.users.find(u => u.email === 'jfcn2020@gmail.com');
      if (!jcnetoExists) {
          dbData.users.push({
              id: 'admin-jcneto',
              name: 'JCneto',
              email: 'jfcn2020@gmail.com',
              password: 'password123',
              status: 'ACTIVE',
              role: 'ADMIN',
              wallet: '0x883a831511a1b71b4920cd32d3694ecef432b585',
              paymentWallet: '0x883a831511a1b71b4920cd32d3694ecef432b585',
              referralCode: 'JCNETO1',
              createdAt: new Date().toISOString()
          });
      } else {
          jcnetoExists.id = 'admin-jcneto';
      }

      const jcnetoLicense = dbData.licenses.find(l => l.key === 'FY-PRO-JCNETO');
      if (!jcnetoLicense) {
          dbData.licenses.push({
              id: 'L_JCNETO',
              userId: 'admin-jcneto',
              key: 'FY-PRO-JCNETO',
              type: 'VITALICIO',
              status: 'ACTIVE',
              hwid: '',
              expiryDate: '2099-12-31T23:59:59.999Z'
          });
      } else {
          jcnetoLicense.userId = 'admin-jcneto';
      }

      await conn.execute('UPDATE fybot_data SET data = ? WHERE id = 1', [JSON.stringify(dbData)]);
      console.log('Banco de dados restaurado e configurado para 8:00 AM!');
    }
    
    await conn.end();
  } catch(e) {
    console.error(e);
  }
}
run();
