const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conectado ao servidor VPS.');
  
  const cmd = `
grep -i "Internal Server Error" /root/fybot/server.ts
pm2 logs --lines 50
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log('--- OUTPUT ---');
      console.log(out);
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    }).stderr.on('data', (data) => {
      out += data.toString();
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
