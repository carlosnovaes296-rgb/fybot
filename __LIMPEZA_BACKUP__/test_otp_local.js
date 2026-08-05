const WebSocket = require('ws');
const https = require('https');

const APP_ID = '36544';
const ACCOUNT_ID = '10229037';
const TOKEN = 'pat_a7386f16d48b9e42e4dc9e9fb20fb328cf51f13b7295f6338e307275a6b39734'; // from earlier screenshot

async function getOtpWebSocketUrl(token, appId, accountId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      loginid: accountId,
      token: token,
      app_id: appId
    });

    const options = {
      hostname: 'oauth.deriv.com',
      port: 443,
      path: '/oauth2/api/v1/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            if (parsed.session_token) {
              const url = `wss://ws.binaryws.com/websockets/v3?app_id=${appId}&l=PT&session_token=${parsed.session_token}`;
              resolve(url);
            } else {
              reject(new Error("No session_token in response: " + data));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

(async () => {
  try {
    console.log("Requesting OTP...");
    const url = await getOtpWebSocketUrl(TOKEN, APP_ID, ACCOUNT_ID);
    console.log("Got URL:", url);
    
    const ws = new WebSocket(url);
    ws.on('open', () => {
      console.log("WS Opened! Sending balance request...");
      ws.send(JSON.stringify({ balance: 1, account: 'all', subscribe: 1 }));
    });
    
    ws.on('message', (data) => {
      console.log("Deriv Response:", data.toString());
      const parsed = JSON.parse(data);
      if (parsed.msg_type === 'balance') {
        console.log("SUCCESS! Got balance!");
        process.exit(0);
      }
      if (parsed.error) {
        console.log("ERROR RECEIVED!");
        process.exit(1);
      }
    });
  } catch (err) {
    console.error("Error:", err.message);
  }
})();
