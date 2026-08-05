const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  // Check how server.ts serves the download
  conn.exec("grep -n 'downloads\\|mq5\\|download' /root/fybot/server.ts | head -30", (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
