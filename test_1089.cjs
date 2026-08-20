const WebSocket = require('ws');

const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=1089&l=PT`;
console.log(`Connecting to ${wsUrl} (1089)`);
const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log('Connected 1089!');
    ws.close();
});

ws.on('error', (err) => {
    console.error('WS Error 1089:', err);
});
