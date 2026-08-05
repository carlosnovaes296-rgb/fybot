const WebSocket = require('ws');

const token = "33TugiuCvNstgwHTJq8ox";
const appId = "36544"; // nosso app id, ou podemos testar 1089

console.log(`Testando WebSocket V3 com token de 21 caracteres: ${token}`);
const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}&l=PT`);

ws.on('open', () => {
    console.log('WS conectado. Enviando authorize...');
    ws.send(JSON.stringify({ authorize: token }));
});

ws.on('message', (data) => {
    const response = JSON.parse(data.toString());
    console.log('Resposta:', JSON.stringify(response, null, 2));
    
    if (response.msg_type === 'authorize') {
        if (!response.error) {
            console.log("SUCESSO! Autenticação V3 funcionou nativamente com o token de 21 caracteres!");
            // Pegar o balance
            ws.send(JSON.stringify({ balance: 1, account: 'all' }));
        }
    }
    
    if (response.msg_type === 'balance') {
        ws.close();
    }
});

ws.on('error', (err) => {
    console.error('Erro:', err);
});
