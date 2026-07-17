const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=33PZwcDs8NqrvpUw1vQIF&l=PT');

ws.on('open', () => {
  console.log('CONNECTED SUCCESSFULLY WITH ALPHANUMERIC APP_ID!');
  ws.close();
});

ws.on('error', (err) => {
  console.error('WS ERROR:', err.message);
});

ws.on('close', (code, reason) => {
  console.log('WS CLOSED:', code, reason.toString());
});
