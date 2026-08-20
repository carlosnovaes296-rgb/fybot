const { Client } = require('ssh2');
const conn = new Client();

const script = `
const WebSocket = require('ws');
function testOrigin(origin) {
    return new Promise((resolve) => {
        const wsUrl = 'wss://ws.derivws.com/websockets/v3?app_id=33TVM6cBQ9GfSjbwQHHdE&l=PT';
        const options = origin ? { headers: { Origin: origin } } : {};
        const ws = new WebSocket(wsUrl, options);
        ws.on('open', () => {
            console.log('SUCCESS with Origin:', origin || 'None');
            ws.close();
            resolve(true);
        });
        ws.on('error', (err) => {
            console.log('FAILED with Origin:', origin || 'None', 'Error:', err.message);
            resolve(false);
        });
    });
}
async function run() {
    await testOrigin(null);
    await testOrigin('http://localhost');
    await testOrigin('https://localhost');
    await testOrigin('http://fybottop.com');
    await testOrigin('https://fybottop.com');
    await testOrigin('https://fybot.com.br');
}
run();
`;

const cmd = `cat << 'EOF' > /root/fybot/test_origins.cjs
${script}
EOF
node /root/fybot/test_origins.cjs`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log(out);
      conn.end();
    }).on('data', (data) => {
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
