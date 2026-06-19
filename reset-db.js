import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.exec('mysql -u root -p1BJPkXYBRk2026@26H fybot_db -e "UPDATE user_states SET daily_profit = 0, bot_running = 1, system_blocked = 0 WHERE user_id = 1" && pm2 restart fybot', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('🎉 Reset DB and restarted!');
      conn.end();
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
