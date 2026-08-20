const fs = require('fs');
const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  conn.exec('cat /root/fybot/backend/database.json', (err, stream) => {
    if (err) throw err;
    let data = '';
    stream.on('close', () => {
      try {
        const db = JSON.parse(data);
        const user = db.users.find(u => u.name.includes('Edson'));
        if (user) {
          console.log('--- USER Edson FOUND ---');
          console.log('Trades:', JSON.stringify(user.state?.trades, null, 2));
          console.log('Logs:', JSON.stringify(user.logs?.slice(-20), null, 2));
        } else {
          console.log('User not found');
        }
      } catch (e) { console.error('Parse error', e); }
      conn.end();
    }).on('data', (d) => {
      data += d.toString();
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000,
});
