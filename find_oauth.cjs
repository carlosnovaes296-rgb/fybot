const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('CONECTAR DERIV')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
    // Print 10 lines before and after
    console.log(lines.slice(Math.max(0, i - 5), i + 15).join('\n'));
  }
});
