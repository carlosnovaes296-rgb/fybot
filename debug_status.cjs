const http = require('http');

http.get('http://localhost:3000/api/status?userId=1jsleiedp', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("STATUS CODE:", res.statusCode);
    console.log("RESPONSE:", data);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
