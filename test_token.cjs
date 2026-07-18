const WebSocket = require('ws');
const token = 'pat_a7386f16d48b9e42e4dc9e9fb20fb328cf51f13b7295f6338e307275a6b39734';

console.log('=== TESTANDO O NOVO TOKEN PAT DA ULTIMA FOTO ===');

const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=1089&l=PT`);
ws.on('open', () => {
  console.log('Conectou! Enviando authorize...');
  ws.send(JSON.stringify({ authorize: token }));
});
ws.on('message', (msg) => {
  console.log('Resposta da Deriv:', msg.toString());
  ws.close();
});
ws.on('error', (e) => {
  console.log('Erro de conexão:', e.message);
});
