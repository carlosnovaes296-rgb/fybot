import WebSocket from 'ws';

const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=36544&l=PT');

ws.on('open', () => {
  ws.send(JSON.stringify({
    active_symbols: "brief",
    product_type: "basic"
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data.toString());
  if (response.active_symbols) {
    const goldSymbols = response.active_symbols.filter(s => 
      s.symbol.includes('XAU') || 
      s.display_name.toLowerCase().includes('gold') || 
      s.display_name.toLowerCase().includes('ouro')
    );
    console.log("Símbolos de Ouro disponíveis:", JSON.stringify(goldSymbols, null, 2));
  } else {
    console.log("Erro/Outro:", response);
  }
  process.exit(0);
});

ws.on('error', (err) => {
  console.error("WS Erro:", err.message);
  process.exit(1);
});
