const http = require('http');

http.get('http://localhost:3000/api/users', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const users = JSON.parse(data);
      const carlos = users.find(u => u.id === '1' || u.name === 'Carlos Novaes');
      if (carlos) {
        console.log(`[Usuário 1] Demo Token: ${carlos.derivTokenDemo ? carlos.derivTokenDemo.substring(0, 8) + '...' : 'vazio'}`);
        console.log(`[Usuário 1] Real Token: ${carlos.derivTokenReal ? carlos.derivTokenReal.substring(0, 8) + '...' : 'vazio'}`);
        
        // Agora vamos testar esse token demo na Deriv
        if (carlos.derivTokenDemo) {
           const ws = require('ws');
           const socket = new ws('wss://ws.derivws.com/websockets/v3?app_id=1089&l=PT');
           socket.on('open', () => {
              socket.send(JSON.stringify({ authorize: carlos.derivTokenDemo }));
           });
           socket.on('message', (msg) => {
              const res = JSON.parse(msg);
              if (res.msg_type === 'authorize') {
                 if (res.error) {
                    console.log(`❌ Deriv recusou o token Demo:`, res.error.message);
                 } else {
                    const id = res.authorize.loginid;
                    const isVirtual = id.includes('VRT') || id.includes('VOT') || id.startsWith('VR') || res.authorize.is_virtual ? 'SIM (DEMO)' : 'NÃO (REAL)';
                    console.log(`✅ Token Demo Autorizado na Deriv!`);
                    console.log(` -> Conta Encontrada: ${id} | Moeda: ${res.authorize.currency} | É Virtual/Demo? ${isVirtual}`);
                 }
                 socket.close();
              }
           });
        }
      }
    } catch(e) { console.log(e); }
  });
});
