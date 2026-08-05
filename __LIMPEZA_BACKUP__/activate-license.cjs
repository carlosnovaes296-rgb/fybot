
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/root/fybot/.env' });

async function run() {
  try {
    const conn = await mysql.createConnection(process.env.MYSQL_URL + '?ssl={"rejectUnauthorized":false}');
    const [rows] = await conn.execute('SELECT data FROM fybot_data WHERE id = 1');
    if (rows.length > 0) {
      const dataVal = rows[0].data;
      const dbData = typeof dataVal === 'string' ? JSON.parse(dataVal) : dataVal;
      
      if (!dbData.licenses) dbData.licenses = [];
      
      const targetLicense = '131feb73-0bea-457d-bd15-e8fd9c6ae46a';
      let found = false;
      
      for (let i = 0; i < dbData.licenses.length; i++) {
        if (dbData.licenses[i].key === targetLicense) {
          dbData.licenses[i].status = 'ACTIVE';
          dbData.licenses[i].expiryDate = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(); // +10 years
          found = true;
          break;
        }
      }
      
      if (!found) {
        dbData.licenses.push({
          id: 'L_MASTER',
          userId: '1',
          key: targetLicense,
          type: 'PRO',
          status: 'ACTIVE',
          hwid: '',
          expiryDate: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
      const newJsonStr = JSON.stringify(dbData);
      await conn.execute('UPDATE fybot_data SET data = ? WHERE id = 1', [newJsonStr]);
      console.log('Licença MASTER ativada com sucesso no banco de dados!');
    }
    await conn.end();
  } catch (err) {
    console.error(err);
  }
}
run();
