const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS.');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('📤 Uploading updated .env file...');
    sftp.fastPut('./.env', '/root/fybot/.env', (uploadErr) => {
      if (uploadErr) throw uploadErr;
      console.log('✅ .env uploaded successfully.');
      sftp.end();

      console.log('🔄 Restarting PM2 process to apply Production Mode...');
      conn.exec('pm2 restart fybot', (execErr, stream) => {
        if (execErr) throw execErr;
        stream.on('close', () => {
          console.log('\n=============================================');
          console.log('🎉 PRODUCTION MODE ENABLED & RESTARTED! 🎉');
          console.log('=============================================');
          conn.end();
        }).on('data', (data) => {
          console.log(data.toString());
        }).stderr.on('data', (data) => {
          console.error(data.toString());
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('❌ Connection Error:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
