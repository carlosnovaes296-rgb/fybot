const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /root/fybot && sed -i "s/if (typeof state !== 'undefined' && state.role === 'ADMIN') return true;//g" server.ts && pm2 restart fybot`, (err, stream) => {
    stream.on('data', d => console.log(d.toString()))
          .on('close', () => conn.end())
          .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H'
});
