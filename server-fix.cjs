const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected. Checking server status...');
  
  // First check PM2 status, then tail error log, then restart
  conn.exec(`pm2 status && echo "---ERRORS---" && tail -20 ~/.pm2/logs/fybot-error.log && echo "---RESTARTING---" && pm2 restart fybot && echo "DONE"`, (err, stream) => {
    let out = '';
    let errOut = '';
    
    stream.on('data', d => {
      out += d.toString();
      process.stdout.write(d);
    });
    stream.stderr.on('data', d => {
      errOut += d.toString();
      process.stderr.write(d);
    });
    stream.on('close', (code) => {
      console.log('\n✅ Command done. Exit code:', code);
      conn.end();
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
