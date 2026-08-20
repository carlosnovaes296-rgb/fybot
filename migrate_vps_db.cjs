const { Client } = require('ssh2');
const conn = new Client();

const cmd = `pm2 stop fybot &&
mysql -u root -p'Fybot2026!' fybot_db -e "
UPDATE users SET referredBy = '1' WHERE referredBy = '1jsleiedp';
UPDATE users SET referredBy = 'ADMIN123' WHERE referredBy = 'ADMIN1UIH';
UPDATE referral_earnings SET sponsorId = '1' WHERE sponsorId = '1jsleiedp';
UPDATE payments SET userId = '1' WHERE userId = '1jsleiedp';
" &&
pm2 start fybot`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log(out);
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000,
});
