const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS.');
  conn.exec('ls -la /root/fybot/src/components /root/fybot/src', (err, stream) => {
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
  password: '1BJPkXYBRk2026@26H'
});
