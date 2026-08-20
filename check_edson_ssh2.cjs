const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('node -e "const fs=require(\'fs\'); const db=JSON.parse(fs.readFileSync(\'/root/fybot/backend/database.json\',\'utf8\')); const edson = db.users.find(u => u.name.includes(\'Edson\')); if(edson) { console.log(JSON.stringify(edson.state?.trades, null, 2)); }"', (err, stream) => {
    let data = '';
    stream.on('data', d => data += d.toString())
          .on('close', () => {
             console.log(data);
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
