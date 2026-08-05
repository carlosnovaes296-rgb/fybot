import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Connected. Fixing license key in server db.json...');
  
  // Read the current db.json and fix it - add FY-PRO-99 license to the admin user
  const fixScript = `
node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/root/fybot/data/db.json', 'utf8'));
console.log('Current DB:', JSON.stringify(db, null, 2));
"
`;
  
  conn.exec(fixScript, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
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
