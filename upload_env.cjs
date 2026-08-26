const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut('c:\\\\Users\\\\sobit\\\\OneDrive\\\\Área de Trabalho\\\\Fybot pro\\\\.env', '/root/fybot/.env', (err) => {
      if (err) throw err;
      console.log('.env uploaded');
      conn.exec('cd /root/fybot && pm2 restart fybot', (err, stream) => {
        stream.on('close', () => {
          console.log('PM2 restarted');
          conn.end();
        });
      });
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H'
});
