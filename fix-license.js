import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Connected. Fixing FY-PRO-99 license status to ACTIVE...');
  
  const fixScript = `node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/root/fybot/data/db.json', 'utf8'));

// Fix FY-PRO-99 license status from UPGRADED to ACTIVE
const fyPro99 = db.licenses.find(l => l.key === 'FY-PRO-99');
if (fyPro99) {
  fyPro99.status = 'ACTIVE';
  fyPro99.expiryDate = '2099-12-31T23:59:59.999Z';
  console.log('Fixed FY-PRO-99 license to ACTIVE');
}

// Also fix userState balance to trigger it from heartbeat
if (db.userStates && db.userStates['1']) {
  db.userStates['1'].accountType = 'REAL';
}

fs.writeFileSync('/root/fybot/data/db.json', JSON.stringify(db, null, 2));
console.log('DB saved successfully!');
"`;
  
  conn.exec(fixScript, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      // Restart the server to pick up changes
      conn.exec('pm2 restart fybot', (err2, stream2) => {
        if (err2) throw err2;
        stream2.on('close', () => {
          console.log('Server restarted! FY-PRO-99 is now ACTIVE. Heartbeat will work!');
          conn.end();
        }).on('data', (d) => process.stdout.write(d))
          .stderr.on('data', (d) => process.stderr.write(d));
      });
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Error: ' + err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
