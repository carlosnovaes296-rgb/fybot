const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
    console.log('derivws connected');
    ws.close();
});
ws.on('error', (e) => console.log('derivws error', e.message));
ws.on('close', (code) => console.log('derivws closed', code));

const ws2 = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
ws2.on('open', () => {
    console.log('binaryws connected');
    ws2.close();
});
ws2.on('error', (e) => console.log('binaryws error', e.message));
ws2.on('close', (code) => console.log('binaryws closed', code));
