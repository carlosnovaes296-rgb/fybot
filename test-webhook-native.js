const https = require('https');
const data = JSON.stringify({
    license: 'ADMIN-1jsleiedp',
    balance: 99.99,
    equity: 99.99,
    daily_profit: 0,
    open_orders: 0,
    trades: []
});
const options = {
    hostname: 'fybot.life',
    port: 443,
    path: '/api/mt5-webhook',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};
const req = https.request(options, res => {
    let response = '';
    res.on('data', d => response += d);
    res.on('end', () => console.log('Response:', response));
});
req.on('error', error => console.error(error));
req.write(data);
req.end();
