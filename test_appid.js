const WebSocket = require('ws');
const app_id = '33PZwcDs8NqrvpUw1vQIF';
const wsUrl = `wss://ws.binaryws.com/websockets/v3?app_id=${app_id}&l=PT`;
console.log("Connecting to:", wsUrl);
const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log("Connected!");
    ws.send(JSON.stringify({ ping: 1 }));
});

ws.on('message', (data) => {
    console.log("Response:", data.toString());
    process.exit(0);
});

ws.on('error', (err) => {
    console.log("Error:", err.message);
    process.exit(1);
});
