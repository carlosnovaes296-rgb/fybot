const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado ao servidor VPS.');
    console.log('🔄 Testando o Webhook no servidor local (http://localhost:3000)...');
    
    conn.exec(`node -e "
      const http = require('http');
      const data = JSON.stringify({
         license: 'ADMIN-MASTER-KEY',
         balance: 10000,
         equity: 10000,
         daily_profit: 0,
         open_orders: 1,
         floating_pnl: -10,
         trades: [{
            id: '123456',
            symbol: 'XAUUSD',
            type: 'buy',
            amount: 0.01,
            entryPrice: 4170.00,
            profit: -10.06,
            status: 'OPEN',
            openTime: 1700000000000
         }]
      });
      const options = {
         hostname: 'localhost',
         port: 3000,
         path: '/api/mt5-webhook',
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
         }
      };
      const req = http.request(options, (res) => {
         console.log('STATUS DO WEBHOOK: ' + res.statusCode);
         res.setEncoding('utf8');
         res.on('data', (chunk) => { console.log('CORPO DA RESPOSTA: ' + chunk); });
      });
      req.on('error', (e) => { console.error('ERRO AO CHAMAR WEBHOOK: ' + e.message); });
      req.write(data);
      req.end();
    "`, (err2, stream) => {
      if (err2) throw err2;
      stream.on('close', (code, signal) => {
          console.log('✅ Webhook testado. Buscando log do PM2...');
          conn.exec('/usr/lib/node_modules/pm2/bin/pm2 logs fybot --lines 10 --nostream', (err3, streamLog) => {
              streamLog.on('close', () => { conn.end(); });
              streamLog.on('data', (d) => console.log(d.toString()));
              streamLog.stderr.on('data', (d) => console.log(d.toString()));
          });
      }).on('data', (data) => {
        console.log(data.toString());
      }).stderr.on('data', (data) => {
        console.error(data.toString());
      });
    });
}).on('error', (err) => {
  console.log('❌ Erro de Conexão:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 120000,
  keepaliveInterval: 10000
});
