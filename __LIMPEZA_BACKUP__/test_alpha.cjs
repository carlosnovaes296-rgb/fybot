const WebSocket = require('ws');

const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=33PVKdgTEIn9JlNjX0izq&l=PT');

ws.on('open', () => {
  console.log('CONECTADO COM SUCESSO AO ALFANUMERICO!');
  process.exit(0);
});

ws.on('error', (err) => {
  console.log('ERRO DE CONEXAO:', err.message);
});

ws.on('close', (code, reason) => {
  console.log('CONEXAO FECHADA:', code, reason.toString());
  process.exit(1);
});
