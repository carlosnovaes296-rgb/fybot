const WebSocket = require('ws');

// Test direct connection to Deriv
const ws = new WebSocket('wss://frontend.binaryws.com/websockets/v3?app_id=36544&l=PT');

ws.on('open', () => {
    console.log('Connected to Deriv! Sending ping...');
    ws.send(JSON.stringify({ ping: 1 }));
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
    ws.close();
});

ws.on('error', (err) => {
    console.error('WS Error:', err.message);
});

ws.on('close', (code, reason) => {
    console.log(`WS Closed: ${code} ${reason.toString()}`);
});
