const { Client } = require('ssh2');
const conn = new Client();

const cmd = `cat << 'EOF' > /root/test_ws.js
const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=33TVM6cBQ9GfSjbwQHHdE&l=PT', {
    headers: { 'Origin': 'https://fybot.life' }
});
ws.on('open', () => { console.log('OPENED!'); ws.close(); });
ws.on('error', (err) => console.log('ERROR:', err.message));
EOF
node /root/test_ws.js`;

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
