const https = require('https');

https.get('https://fybot.life/api/user/profile?userId=1', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const user = JSON.parse(data);
      console.log("=== DADOS REAIS DO BANCO DE DADOS ===");
      console.log("Token DEMO salvo:", user.derivTokenDemo ? "SIM (" + user.derivTokenDemo.substring(0,5) + "...)" : "VAZIO");
      console.log("Token REAL salvo:", user.derivTokenReal ? "SIM (" + user.derivTokenReal.substring(0,5) + "...)" : "VAZIO");
      console.log("Conta Ativa:", user.activeAccountType);
    } catch(e) {
      console.log(data);
    }
  });
}).on('error', err => console.log(err.message));
