const fs = require('fs');
const path = require('path');

function searchFiles(dir, keyword) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        searchFiles(fullPath, keyword);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(keyword)) {
        console.log(`Found in: ${fullPath}`);
      }
    }
  }
}

searchFiles(process.cwd(), 'deriv-test');
