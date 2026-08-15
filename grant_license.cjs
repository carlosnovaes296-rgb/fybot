const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS.');
  const query = `
    SET @userId = (SELECT id FROM users WHERE email = 'laidesantos33@gmail.com' LIMIT 1);
    UPDATE users SET status = 'ACTIVE' WHERE id = @userId;
    UPDATE licenses SET status = 'UPGRADED' WHERE userId = @userId AND status = 'ACTIVE';
    INSERT INTO licenses (id, userId, type, status, expiryDate) 
    VALUES (UUID(), @userId, 'LIFETIME', 'ACTIVE', '2099-12-31 23:59:59');
    SELECT 'License granted to laidesantos33@gmail.com' as result;
  `;
  
  conn.exec(`mysql -u root -pFybot2026! fybot_db -e "${query}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('❌ Connection Error:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
