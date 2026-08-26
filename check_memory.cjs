const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const code = `
    const http = require('http');
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/users',
      method: 'GET',
      headers: {
        'x-admin-userid': '1'
      }
    }, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        const users = JSON.parse(d);
        const marcelo = users.find(u => u.name && u.name.includes('MARCELO'));
        console.log('MARCELO IN MEMORY:', JSON.stringify(marcelo, null, 2));
      });
    });
    req.on('error', console.error);
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
