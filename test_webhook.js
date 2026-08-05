const https = require('https');

const postData = JSON.stringify({
  license: 'FY-PRO-JCNETO',
  balance: 10005.50,
  open_orders: 2,
  trades: [
    { id: "12345", status: "OPEN", profit: 10.5, symbol: "XAUUSD" }
  ]
});

const req = https.request({
  hostname: 'fybot.life',
  port: 443,
  path: '/api/mt5-webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
