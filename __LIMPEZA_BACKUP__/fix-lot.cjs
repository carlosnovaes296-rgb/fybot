const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/const lot = 0\.002;/g, 'const lot = 0.01;');
fs.writeFileSync('server.ts', code);
console.log('Lot size fixed to 0.01');
