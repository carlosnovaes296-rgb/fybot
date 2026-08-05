const fs = require('fs');
const content = fs.readFileSync('b64.txt', 'utf16le');
if (content.startsWith('ey')) {
  console.log('It is base64 encoded JSON!');
  const decoded = Buffer.from(content, 'base64').toString('utf8');
  console.log(decoded.substring(0, 500));
} else {
  console.log(content.substring(0, 500));
}
