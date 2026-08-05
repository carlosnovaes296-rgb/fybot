import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.exec('cd /root/fybot && pm2 restart fybot', (err2, stream2) => {
    if (err2) throw err2;
    
    stream2.on('data', (data) => console.log('STDOUT: ' + data));
    stream2.stderr.on('data', (data) => console.error('STDERR: ' + data));
    
    stream2.on('close', () => {
      console.log('🎉 Server restarted!');
      conn.end();
    });
  });
}).on('error', (err) => {
  console.error('SSH Error: ' + err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
