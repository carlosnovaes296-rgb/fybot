import { Client } from 'ssh2';

const MYSQL_URL = `mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-do-user-36307313-0.a.db.ondigitalocean.com:25060/defaultdb`;

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected. Configuring MySQL on server...');
  
  const commands = [
    // Write .env with MySQL URL
    `echo 'MYSQL_URL="${MYSQL_URL}"' > /root/fybot/.env`,
    // Pull latest code (which has MySQL support)
    'cd /root/fybot && git pull origin main',
    // Install mysql2 and remove mongoose
    'cd /root/fybot && npm install mysql2 && npm uninstall mongoose || true',
    // Restart with MySQL
    'cd /root/fybot && pm2 restart fybot'
  ];

  let i = 0;
  const labels = [
    '📝 Writing MySQL credentials to .env...',
    '📥 Pulling latest code from GitHub...',
    '📦 Installing mysql2 package...',
    '🔄 Restarting server with MySQL...'
  ];

  const runNext = () => {
    if (i >= commands.length) {
      console.log('\n🎉 MIGRATION COMPLETE! Server is now running with MySQL DigitalOcean!');
      conn.end();
      return;
    }
    const cmd = commands[i];
    console.log(labels[i]);
    i++;
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
