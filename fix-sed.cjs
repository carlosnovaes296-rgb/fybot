const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('sed -i "17d" /root/fybot/server.ts && pm2 restart fybot', (err, stream) => {
    stream.on('close', () => {
      console.log("Deleted line 17 and restarted!");
      conn.end();
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H'
});
