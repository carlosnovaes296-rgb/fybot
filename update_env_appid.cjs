const { Client } = require('ssh2');
const conn = new Client();

const cmd = `sed -i 's/DERIV_APP_ID=33PZwcDs8NqrvpUw1vQIF/DERIV_APP_ID=33TVM6cBQ9GfSjbwQHHdE/g' /root/fybot/.env && cd /root/fybot && pm2 restart fybot`;

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
  readyTimeout: 30000,
});
