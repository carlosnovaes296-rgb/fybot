import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Connected. Pulling latest code and restarting...');
  
  const cmds = [
    'cd /root/fybot && git pull origin main',
    'cd /root/fybot && pm2 restart fybot'
  ];
  
  let i = 0;
  const runNext = () => {
    if (i >= cmds.length) { conn.end(); return; }
    const cmd = cmds[i++];
    console.log(`Running: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('close', runNext)
            .on('data', d => process.stdout.write(d))
            .stderr.on('data', d => process.stderr.write(d));
    });
  };
  runNext();
}).on('error', (err) => {
  console.error('SSH Error: ' + err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
