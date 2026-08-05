const { Client } = require('ssh2');
const fs = require('fs');

const fixScriptContent = `
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
      
      const targetLicense = '0eee47de-b28f-4abf-8044-8cfec9d111ce';
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
`;

fs.writeFileSync('activate-license.cjs', fixScriptContent);

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut('activate-license.cjs', '/root/fybot/activate-license.cjs', (err) => {
      if (err) throw err;
      conn.exec('node /root/fybot/activate-license.cjs', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          conn.exec('pm2 restart fybot', (err2, stream2) => {
             stream2.on('close', () => conn.end());
          });
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
