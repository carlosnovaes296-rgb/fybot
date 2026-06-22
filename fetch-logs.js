import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('tail -n 100 /root/.pm2/logs/fybot-out.log', (err, stream) => {
    if (err) throw err;
    let dataOut = '';
    stream.on('close', () => {
      fs.writeFileSync('./remote-logs.log', dataOut);
      conn.end();
    }).on('data', d => dataOut += d.toString())
      .stderr.on('data', d => dataOut += d.toString());
  });
}).connect({
  host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 30000
});
