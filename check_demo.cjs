const token = "pat_cb9cfecf64723d74f070c2072844da9abb91b66dca71e985ce0021a43e8f32a4";

const ws = require('ws');
const socket = new ws('wss://ws.derivws.com/websockets/v3?app_id=1089&l=PT');

console.log(`Testando token: ${token.substring(0, 10)}...`);

socket.on('open', () => {
    socket.send(JSON.stringify({ authorize: token }));
});

socket.on('message', (msg) => {
    const res = JSON.parse(msg);
    if (res.msg_type === 'authorize') {
        if (res.error) {
            console.log(`❌ Deriv recusou o token:`, res.error.message);
        } else {
            const id = res.authorize.loginid;
            const isVirtual = id.includes('VRT') || id.includes('VOT') || id.startsWith('VR') || res.authorize.is_virtual ? 'SIM (DEMO)' : 'NÃO (REAL)';
            console.log(`✅ Token Autorizado na Deriv!`);
            console.log(` -> Conta Encontrada: ${id} | Moeda: ${res.authorize.currency} | É Virtual/Demo? ${isVirtual}`);
            console.log(` -> Dados Brutos:`, JSON.stringify(res.authorize));
        }
        socket.close();
    }
});
