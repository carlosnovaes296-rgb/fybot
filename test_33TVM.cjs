const WebSocket = require('ws');

const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=33TVM6cBQ9GfSjbwQHHdE&l=PT`;
console.log(`Connecting to ${wsUrl} (Alphanumeric App ID)`);
const ws = new WebSocket(wsUrl, {
    headers: {
        'Origin': 'http://localhost'
    }
});

ws.on('open', () => {
    console.log('Connected 33TVM...!');
    ws.close();
});

ws.on('error', (err) => {
    console.error('WS Error 33TVM...:', err);
});
