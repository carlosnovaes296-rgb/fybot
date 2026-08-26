const { Client } = require('ssh2');
const conn = new Client();

const cmd = `sed -i 's/DERIV_APP_ID=33TVM6cBQ9GfSjbwQHHdE/DERIV_APP_ID=34bOZbDxJP7IkYh3EO6X0/g' /root/fybot/.env && cd /root/fybot && pm2 restart fybot`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 10000,
});
