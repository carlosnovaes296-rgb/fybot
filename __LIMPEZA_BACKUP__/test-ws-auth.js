const { WebSocket } = require('ws');

const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=33TVM6cBQ9GfSjbwQHHdE&l=PT', {
  headers: {
    'Origin': 'https://fybot.life',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
  }
});

ws.on('open', () => {
  console.log('CONECTADO COM SUCESSO A 33TVM!');
  ws.close();
});

ws.on('error', (err) => {
  console.error('ERRO AO CONECTAR A 33TVM:', err.message);
});

ws.on('unexpected-response', (request, response) => {
  console.error('UNEXPECTED RESPONSE:', response.statusCode);
  response.on('data', (chunk) => {
    console.error('BODY:', chunk.toString());
  });
});
