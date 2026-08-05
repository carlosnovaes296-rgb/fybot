const WebSocket = require('ws');

const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');

ws.on('open', () => {
  ws.send(JSON.stringify({
    active_symbols: "brief",
    product_type: "basic"
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  if (response.msg_type === 'active_symbols') {
    const symbols = response.active_symbols;
    const gold = symbols.filter(s => s.symbol.includes('XAU') || s.display_name.includes('Gold'));
    console.log("Gold symbols:", gold);
    
    // Also check for 1HZ100V
    const hz = symbols.filter(s => s.symbol.includes('1HZ'));
    console.log("1HZ symbols:", hz.slice(0, 2));

    ws.close();
  } else if (response.error) {
    console.error("Error:", response.error);
    ws.close();
  }
});
