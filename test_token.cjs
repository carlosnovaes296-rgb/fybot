const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conectado ao servidor VPS.');
  
  const cmd = `
cat << 'EOF' > /tmp/test_token.cjs
const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089&l=PT', {
    origin: 'https://app.deriv.com'
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
node /tmp/test_token.cjs
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
