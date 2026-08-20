const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat /root/fybot/backend/database.json', (err, stream) => {
    let data = '';
    stream.on('data', d => data += d.toString())
          .on('close', () => {
             const db = JSON.parse(data);
             const edson = db.users.find(u => u.name.includes('Edson'));
             if (edson) {
               console.log('--- EDSON TRADES ---');
               console.log(JSON.stringify(edson.state?.trades, null, 2));
               console.log('--- EDSON LOGS ---');
               console.log(JSON.stringify(edson.logs?.slice(-20), null, 2));
             } else {
               console.log('Edson not found');
             }
             conn.end();
          });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000,
});
