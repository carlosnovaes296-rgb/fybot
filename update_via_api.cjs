const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const code = `
    const http = require('http');
    const data = JSON.stringify({ role: 'USER' });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/users/f8eidlfde',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-admin-userid': '1'
      }
    }, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => console.log('Response:', d));
    });
    req.on('error', console.error);
    req.write(data);
    req.end();
  `;
  conn.exec(`node -e "${code.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', d => console.log(d.toString()))
      .stderr.on('data', d => console.log(d.toString()));
  });
}).on('error', console.error).connect({
  host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 60000
});
