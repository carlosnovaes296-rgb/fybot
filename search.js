const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('const toggleBot')) {
    console.log(`Line ${index + 1}: ${line}`);
    // print 20 lines after
    for (let i = 1; i <= 20; i++) {
      console.log(`Line ${index + 1 + i}: ${lines[index + i]}`);
    }
  }
});
