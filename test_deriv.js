const https = require('https');
const WebSocket = require('ws');

const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');

ws.on('open', () => {
  ws.send(JSON.stringify({
    ticks_history: 'frxXAUUSD',
    end: 'latest',
    count: 1,
    style: 'candles',
    granularity: 60
  }));
});

ws.on('message', (data) => {
  console.log(data.toString());
  ws.close();
});
