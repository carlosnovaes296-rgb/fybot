const { Client } = require('ssh2');
const conn = new Client();

const cmd = `
sed -i 's/dynamicStake = balance \\* 0.05; \\/\\/ 5%/dynamicStake = balance \\* 0.03; \\/\\/ 3%/g' /root/fybot/backend/services/DerivConnectionManager.ts
cd /root/fybot && npm run build && pm2 restart fybot
`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log(out);
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    }).stderr.on('data', (data) => {
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
  readyTimeout: 60000,
});
