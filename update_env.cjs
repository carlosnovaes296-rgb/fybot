const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('sed -i "s/DERIV_APP_ID=.*/DERIV_APP_ID=34bOZbDxJP7IkYh3EO6X0/g" /root/fybot/.env', (err, stream) => {
    stream.on('close', () => {
      console.log('VPS .env updated');
      conn.end();
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H'
});
