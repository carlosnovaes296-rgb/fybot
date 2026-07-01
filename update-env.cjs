const { Client } = require('ssh2');

const conn = new Client();
const newDbUrl = 'mysql://doadmin:AVNS_fl8NXvhBPAZS8KIZeYn@db-mysql-fybot-jun-30-backup-do-user-36307313-0.g.db.ondigitalocean.com:25060/defaultdb';

const config = {
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
};

conn.on('ready', () => {
  console.log('SSH Connection Established. Forcing PM2 to load the new .env...');
  
  const commands = [
    `echo "MYSQL_URL=${newDbUrl}" > /root/fybot/.env`,
    'cd /root/fybot && pm2 restart fybot --update-env'
  ];

  let i = 0;
  
  const runNext = () => {
    if (i >= commands.length) {
      console.log('Feito! O PM2 foi forçado a recarregar as variáveis de ambiente novas.');
      conn.end();
      return;
    }
    
    const cmd = commands[i++];
    console.log(`Executando passo ${i}...`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('close', (code) => {
        runNext();
      }).on('data', (data) => {
        process.stdout.write(data);
      }).stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    });
  };
  
  runNext();
}).on('error', (err) => {
  console.error('SSH Connection Error: ' + err);
}).connect(config);
