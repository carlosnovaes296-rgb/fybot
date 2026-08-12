const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('balance') || line.includes('SALDO')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
