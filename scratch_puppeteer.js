import fs from 'fs';

function findUnclosed(content, startLine, endLine, name) {
  const lines = content.split('\n');
  let openTags = [];
  
  for (let i = startLine - 1; i < endLine && i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('/*') && !line.includes('*/')) continue;
    
    const openCount = (line.match(/<div(?=[\s>])/g) || []).length;
    const selfClosing = (line.match(/<div[^>]*\/>/g) || []).length;
    const closeCount = (line.match(/<\/div\s*>/g) || []).length;
    
    for (let j = 0; j < openCount - selfClosing; j++) {
      openTags.push({ line: i + 1, text: line.trim() });
    }
    for (let j = 0; j < closeCount; j++) {
      if (openTags.length > 0) {
        openTags.pop();
      }
    }
  }
  
  console.log(`[${name}] Unclosed tags:`);
  openTags.forEach(tag => console.log(`  Line ${tag.line}: ${tag.text}`));
}

const https = require('https');
const vm = require('vm');

https.get('https://fybot.life/assets/index-fl4cL03P.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      new vm.Script(data);
      console.log('JS syntax is VALID.');
    } catch (e) {
      console.error('JS Syntax ERROR:', e);
    }
  });
}).on('error', err => {
  console.error('Error fetching JS:', err.message);
});
findUnclosed(content, 2585, 3197, 'Affiliates');
