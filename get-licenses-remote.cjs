const { Client } = require('ssh2');
const fs = require('fs');

const fixScriptContent = `
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: '/root/fybot/.env' });

async function run() {
  try {
    const conn = await mysql.createConnection(process.env.MYSQL_URL + '?ssl={"rejectUnauthorized":false}');
    const [rows] = await conn.execute('SELECT data FROM fybot_data WHERE id = 1');
    if (rows.length > 0) {
      const dataVal = rows[0].data;
      const dbData = typeof dataVal === 'string' ? JSON.parse(dataVal) : dataVal;
      console.log("Licenses no BD remoto:", JSON.stringify(dbData.licenses, null, 2));
    }
    await conn.end();
  } catch (err) {
    console.error(err);
  }
}
run();
`;

fs.writeFileSync('run-licenses.cjs', fixScriptContent);

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut('run-licenses.cjs', '/root/fybot/run-licenses.cjs', (err) => {
      if (err) throw err;
      conn.exec('node /root/fybot/run-licenses.cjs', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          conn.end();
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
