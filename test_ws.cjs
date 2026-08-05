const WebSocket = require('ws');

console.log('--- TESTE DE DIAGNÓSTICO DERIV API (COM SEU APP ID) ---');
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=33TVM6cBQ9GfSjbwQHHdE&l=PT', {
    headers: {
        'Origin': 'https://fybot.life',
        'User-Agent': 'Mozilla/5.0'
    }
});

let startTime = Date.now();

ws.on('open', () => {
    console.log('[+] Conectado à Deriv. Tempo: 0s');
    ws.send(JSON.stringify({ ping: 1 }));

    // Pedido 1
    ws.send(JSON.stringify({
        ticks_history: 'frxXAUUSD',
        end: 'latest',
        count: 250,
        style: 'candles',
        granularity: 3600,
        subscribe: 1,
        req_id: 3600
    }));
    console.log('[+] Pedido H1 Enviado');
});

ws.on('message', (data) => {
    const msg = JSON.parse(data);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (msg.error) {
        console.error(`[${elapsed}s] ERRO DA DERIV:`, msg.error);
    } else if (msg.msg_type === 'ping') {
        console.log(`[${elapsed}s] PONG Recebido`);
    } else if (msg.msg_type === 'candles') {
        console.log(`[${elapsed}s] Velas recebidas! (req_id=${msg.req_id})`);
    } else if (msg.msg_type === 'ohlc') {
        // Ignora
    } else {
        console.log(`[${elapsed}s] Tipo de mensagem:`, msg.msg_type);
    }
});

ws.on('close', () => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[${elapsed}s] [-] CONEXÃO FECHADA PELA DERIV!`);
    process.exit(1);
});
