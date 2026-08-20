const { Client } = require('ssh2');
const conn = new Client();

const cmd = `pm2 stop fybot && mysql -u root -p'Fybot2026!' fybot_db -e "UPDATE users SET role = 'USER' WHERE id != '1' AND id != '1jsleiedp';" && pm2 start fybot`;

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
