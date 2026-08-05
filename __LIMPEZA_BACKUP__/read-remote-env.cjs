const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat /root/fybot/.env`, (err, stream) => {
    let output = '';
    stream.on('data', d => output += d.toString())
          .on('close', () => {
             console.log(output);
             conn.end();
          })
          .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
