const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('app.post') || line.includes('app.get') || line.includes('app.put') || line.includes('app.delete')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
