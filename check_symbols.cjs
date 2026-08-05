const WebSocket = require('ws');

const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');

ws.on('open', () => {
    ws.send(JSON.stringify({
        active_symbols: 'brief',
        product_type: 'basic'
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.msg_type === 'active_symbols') {
        const symbols = msg.active_symbols;
        console.log(`Encontrados ${symbols.length} simbolos.`);
        const goldSymbols = symbols.filter(s => s.symbol.toUpperCase().includes('XAU') || s.display_name.toUpperCase().includes('GOLD') || s.display_name.toUpperCase().includes('OURO'));
        console.log('Possíveis símbolos para Ouro:');
        console.log(goldSymbols.map(s => `${s.symbol} - ${s.display_name} (${s.market})`));
        process.exit(0);
    }
});
