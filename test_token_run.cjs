const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conectado ao servidor VPS.');
  
  const cmd = `
cat << 'EOF' > /root/fybot/test_token_run.cjs
const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=36544&l=PT', {
    origin: 'https://api.deriv.com'
});

ws.on('open', () => {
    console.log('Connected. Sending authorize...');
    ws.send(JSON.stringify({ authorize: "pat_01ab9fff3ada2409fc1d68263690d2f10d96400f73fdc81a3b52c634fa1f7061" }));
});

ws.on('message', (data) => {
    console.log('Message received:', data.toString());
    process.exit(0);
});

ws.on('error', (err) => {
    console.error('Error:', err);
});
EOF
cd /root/fybot
node test_token_run.cjs
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log('--- OUTPUT ---');
      console.log(out);
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    }).stderr.on('data', (data) => {
      out += data.toString();
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
