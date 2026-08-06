const fs = require('fs');
const content = fs.readFileSync('__LIMPEZA_BACKUP__/stash_App.tsx', 'utf8');
const lines = content.split('\n');
let results = [];
lines.forEach((line, index) => {
  if (line.includes('TradingChart') || line.includes('AreaChart')) {
    results.push(`${index + 1}: ${line.trim()}`);
  }
});
fs.writeFileSync('output.txt', results.join('\n'));
console.log("Done");
