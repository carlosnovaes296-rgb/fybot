const WebSocket = require('ws');

const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=33TVM6cBQ9GfSjbwQHHdE&l=PT`;
console.log(`Connecting to ${wsUrl}`);
const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log('Connected!');
    ws.send(JSON.stringify({ ping: 1 }));
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
    ws.close();
});

ws.on('error', (err) => {
    console.error('WS Error:', err);
});

ws.on('close', (code, reason) => {
    console.log(`Closed with code ${code}, reason: ${reason}`);
});
