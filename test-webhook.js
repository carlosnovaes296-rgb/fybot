const fetch = require('node-fetch');
fetch('https://fybot.life/api/mt5-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        license: 'ADMIN-1jsleiedp',
        balance: 99.99,
        equity: 99.99,
        daily_profit: 0,
        open_orders: 0,
        trades: []
    })
}).then(r => r.json()).then(console.log).catch(console.error);
