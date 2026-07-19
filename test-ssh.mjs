import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected. Testing WebSockets...');
  
  const script = `
const WebSocket = require('ws');
const token = 'pat_5473217af4e34658dc6015a4ee57e83165bedc0a3ee9d2bfa1fbcf4255967cb6';

function testUrl(url) {
  console.log('Testing:', url);
  const ws = new WebSocket(url);
  ws.on('open', () => {
    ws.send(JSON.stringify({ authorize: token }));
  });
  ws.on('message', (msg) => {
    console.log(url, 'RESPONSE:', msg.toString());
    ws.close();
  });
  ws.on('error', (err) => {
    console.error(url, 'ERROR:', err.message);
  });
}

testUrl('wss://ws.derivws.com/');
testUrl('wss://api.derivws.com/');
testUrl('wss://ws.derivws.com/websockets/v3?app_id=1089');
  `;

  conn.exec(`node -e "${script.replace(/"/g, '\\"')}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
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
  password: '1BJPkXYBRk2026@26H'
});
