const WebSocket = require('ws');

const token = "pat_1465adebb62a2d2b9c852ae1e1be31605bbea18b98e51052fa48fa81241f0329";
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=36544');

ws.on('open', () => {
    console.log("Conectado! Autenticando com o token...");
    ws.send(JSON.stringify({ authorize: token }));
});

ws.on('message', (data) => {
    const res = JSON.parse(data);
    if (res.error) {
        console.log("ERRO:", res.error.message);
        ws.close();
        return;
    }
    
    if (res.msg_type === 'authorize') {
        const accs = res.authorize.account_list;
        console.log("\n=== CONTAS ENCONTRADAS NESTE TOKEN ===");
        accs.forEach(a => {
            console.log(`-> Conta: ${a.loginid} | Moeda: ${a.currency} | Virtual? ${a.is_virtual ? 'SIM (DEMO)' : 'NÃO (REAL)'}`);
        });
        ws.close();
    }
});
