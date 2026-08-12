const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
lines.forEach((line, i) => {
  if (line.toLowerCase().includes('webhook')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
