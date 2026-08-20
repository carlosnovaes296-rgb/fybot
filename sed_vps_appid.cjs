const { Client } = require('ssh2');
const conn = new Client();

const cmd = `cd /root/fybot && sed -i 's/33TVM6cBQ9GfSjbwQHHdE/1089/g' backend/deriv/config.ts backend/services/DerivBotEngine.ts backend/services/DerivBotEngineEMA.ts backend/services/DerivConnectionManager.ts server.ts && pm2 restart fybot`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log(out);
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000,
});
