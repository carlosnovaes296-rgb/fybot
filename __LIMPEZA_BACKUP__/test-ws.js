const WebSocket = require('ws');
const token = "pat_5473217af4e34658dc6015a4ee57e83165bedc0a3ee9d2bfa1fbcf4255967cb6";

function testUrl(url) {
  console.log("Testing:", url);
  const ws = new WebSocket(url);
  ws.on('open', () => {
    console.log(url, "opened. Sending authorize...");
    ws.send(JSON.stringify({ authorize: token }));
  });
  ws.on('message', (msg) => {
    console.log(url, "message:", msg.toString());
    ws.close();
  });
  ws.on('error', (err) => {
    console.error(url, "error:", err.message);
  });
}

testUrl('wss://ws.derivws.com/websockets/v3?app_id=1089');
testUrl('wss://ws.derivws.com/');
testUrl('wss://api.derivws.com/');
