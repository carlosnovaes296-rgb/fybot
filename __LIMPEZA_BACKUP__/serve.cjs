const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  if (req.url === '/server.ts') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    fs.createReadStream('server.ts').pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(8080, () => {
  console.log('Serving on 8080');
});
