const { Client } = require('ssh2');
const conn = new Client();

const cmd = `sed -i "s/const appId = '33NJDNR9tjLaaXmiaY04n';/const appId = process.env.DERIV_APP_ID;/g" /root/fybot/backend/controllers/derivController.ts && cd /root/fybot && npm run build && pm2 restart fybot`;

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
