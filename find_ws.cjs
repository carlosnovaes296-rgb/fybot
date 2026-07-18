const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('WebSocket')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
