const fs = require('fs');

const findUrl = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const fullPath = `${dir}/${f}`;
    if (fs.statSync(fullPath).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') findUrl(fullPath);
    } else {
      if (f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.mq5')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('209.97.163.75:3000')) {
          console.log(`FOUND IN ${fullPath}`);
        }
      }
    }
  });
};
findUrl('.');
