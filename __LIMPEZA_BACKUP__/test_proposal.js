const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

ws.on('open', () => {
    ws.send(JSON.stringify({
        proposal: 1,
        amount: 1,
        basis: "multiplier",
        contract_type: "MULTUP",
        currency: "USD",
        multiplier: 100,
        symbol: "R_100"
    }));
});

ws.on('message', (data) => {
    console.log(JSON.parse(data));
    ws.close();
});
