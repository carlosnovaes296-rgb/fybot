const http = require('http');

const req = http.request({
  hostname: '209.97.163.75',
  port: 3000,
  path: '/api/config',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.on('error', console.error);
req.write(JSON.stringify({ minScore: 10 }));
req.end();
