const WebSocket = require('ws');

function testWs(appId) {
  const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}&l=PT`);
  ws.on('open', () => {
    console.log(`Connected with ${appId}`);
    ws.send(JSON.stringify({ ping: 1 }));
  });
  ws.on('message', (data) => {
    console.log(`Response for ${appId}:`, JSON.parse(data));
    ws.close();
  });
  ws.on('error', (err) => {
    console.log(`Error for ${appId}:`, err.message);
  });
}

testWs('33TVM6cBQ9GfSjbwQHHdE');
setTimeout(() => testWs('34bOZbDxJP7IkYh3EO6X0'), 2000);
