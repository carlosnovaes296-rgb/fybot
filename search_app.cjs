const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('api/control') || line.includes('/api/admin/deriv-test/start') || line.includes('botRunning') || line.includes('toggleBot')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
