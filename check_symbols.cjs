const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
  ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic' }));
});
ws.on('message', (msg) => {
  const data = JSON.parse(msg);
  if (data.active_symbols) {
    const symbols = data.active_symbols.map(s => s.symbol).filter(s => s.includes('100'));
    console.log('Symbols matching 100:', symbols);
  } else {
    console.log('Error:', data);
  }
  ws.close();
});
