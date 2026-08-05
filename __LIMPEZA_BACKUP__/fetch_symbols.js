const https = require('https');
https.get('https://api.derivws.com/trading/v1/options/active-symbols?active_symbols=brief', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    const json = JSON.parse(data);
    const goldSymbols = json.active_symbols.filter(s => s.display_name.includes('Gold') || s.symbol.includes('XAU'));
    console.log(goldSymbols.map(s => ({symbol: s.symbol, name: s.display_name})));
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
