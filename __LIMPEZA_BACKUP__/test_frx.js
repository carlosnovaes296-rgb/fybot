const WebSocket = require('ws');

const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089&l=PT');

ws.on('open', () => {
    console.log('Connected');
    ws.send(JSON.stringify({
        ticks_history: 'frxXAUUSD',
        adjust_start_time: 1,
        count: 10,
        end: 'latest',
        style: 'candles',
        granularity: 60
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data);
    console.log(JSON.stringify(msg, null, 2));
    if (msg.error) {
        console.error('Error:', msg.error);
    }
    process.exit(0);
});

ws.on('error', (err) => {
    console.error('WS Error:', err);
    process.exit(1);
});
