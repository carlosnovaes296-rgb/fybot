import WebSocket from 'ws';

const token = 'pat_10134a80d677f7fe4e43545f4cea28b2a8ad7f59608c030f180bab143b7d92e8';
const appId = 1089;

console.log('\n=======================================');
console.log('🧪 TESTE OFICIAL DO TOKEN DA DERIV VIA WEBSOCKET');
console.log(`⏰ HORA DO TESTE (UTC): ${new Date().toISOString()}`);
console.log('=======================================');
console.log('Conectando ao servidor oficial da Deriv...');

const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}&l=PT`);

ws.on('open', () => {
    console.log('✅ Conectado! Enviando pedido de autorização com o novo token pat_...');
    ws.send(JSON.stringify({ authorize: token }));
});

ws.on('message', (data) => {
    const response = JSON.parse(data);
    
    if (response.msg_type === 'authorize') {
        if (response.error) {
            console.log('\n❌ RESULTADO DA CORRETORA (ERRO):');
            console.log('Código do Erro:', response.error.code);
            console.log('Mensagem:', response.error.message);
            console.log('\n(Envie essa mensagem exata acima para o suporte!)');
        } else {
            console.log('\n✅ RESULTADO DA CORRETORA (SUCESSO):');
            console.log('Token autorizado com sucesso para a conta:', response.authorize.loginid);
            console.log('Saldo:', response.authorize.balance, response.authorize.currency);
        }
        console.log('\n=======================================\n');
        ws.close();
    }
});

ws.on('error', (err) => {
    console.log('\n❌ ERRO DE REDE:', err.message);
});
