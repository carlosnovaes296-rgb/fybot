const fs = require('fs');

const ea = fs.readFileSync('public/Fybot.mq5', 'utf8');
const match = ea.match(/http[^\"]+/g);
console.log('EA URLS:', match);

const files = fs.readdirSync('src/components');
files.forEach(f => {
  const content = fs.readFileSync(`src/components/${f}`, 'utf8');
  const m = content.match(/http[^\"]+/g);
  if (m) console.log(`${f} URLS:`, m);
});
