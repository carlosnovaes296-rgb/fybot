const WebSocket = require('ws');

const appId = '33PUJqpmJKq1w3oBmSwvV';
const urls = [
  `wss://ws.binaryws.com/websockets/v3?app_id=${appId}&l=PT`,
  `wss://ws.derivws.com/websockets/v3?app_id=${appId}&l=PT`
];

urls.forEach(url => {
  const ws = new WebSocket(url, {
    headers: {
      'Origin': 'https://fybot.life',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  ws.on('open', () => {
    console.log(`[SUCCESS] Connected to ${url}`);
    ws.close();
  });

  ws.on('error', (err) => {
    console.error(`[ERROR] Failed to connect to ${url}:`, err.message);
  });
  
  ws.on('close', (code, reason) => {
      console.log(`[CLOSE] ${url} closed with code ${code} and reason ${reason}`);
  });
});

setTimeout(() => process.exit(0), 5000);
