const WebSocket = require('ws');

const appId = '33TVM6cBQ9GfSjbwQHHdE';
const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}&l=PT`, {
    headers: {
        'Origin': 'https://fybot.life',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
});

ws.on('open', () => {
    console.log('Conectado à Deriv. Enviando requisição ticks_history (Ouro/XAUUSD)...');
    
    // Requisição 1: Streaming M5
    ws.send(JSON.stringify({
        ticks_history: "frxXAUUSD",
        end: "latest",
        count: 100,
        style: "candles",
        granularity: 300,
        subscribe: 1,
        req_id: 300
    }));
});

ws.on('close', (code, reason) => {
    console.log('\n=================================================');
    console.log('❌ CONEXÃO FECHADA PELA DERIV');
    console.log('CÓDIGO DE FECHAMENTO (CLOSE CODE):', code);
    console.log('MOTIVO (REASON):', reason.toString() || 'Nenhum texto de motivo enviado pela Deriv');
    console.log('=================================================\n');
    process.exit(0);
});

ws.on('error', (err) => {
    console.log('Erro de Socket:', err);
});

ws.on('message', (data) => {
    const msg = data.toString();
    console.log('🟢 Recebido da Deriv:', msg.substring(0, 150) + (msg.length > 150 ? '...' : ''));
    
    const json = JSON.parse(msg);
    if(json.error) {
        console.log('\n⚠️ ERRO NA RESPOSTA DA DERIV:');
        console.log('Código do Erro:', json.error.code);
        console.log('Mensagem:', json.error.message);
    }
});
