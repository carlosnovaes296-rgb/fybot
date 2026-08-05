const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  // Check the last few lines of the error log directly
  conn.exec(`tail -n 30 ~/.pm2/logs/fybot-error.log`, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d.toString())
          .stderr.on('data', d => out += '[STDERR] ' + d.toString());
    stream.on('close', () => {
      console.log(out || 'No errors found!');
      conn.end();
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
