import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

const config = {
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
};

const localDbData = fs.readFileSync('./data/db.json', 'utf8');

conn.on('ready', () => {
  console.log('SSH Connection Established. Pushing local DB and disabling Mongo...');
  
  const commands = [
    'echo "" > /root/fybot/.env',
    'mkdir -p /root/fybot/data',
    `cat << 'EOF' > /root/fybot/data/db.json\n${localDbData}\nEOF`,
    'cd /root/fybot && pm2 restart fybot'
  ];

  let i = 0;
  
  const runNext = () => {
    if (i >= commands.length) {
      console.log('Database override completed successfully!');
      conn.end();
      return;
    }
    
    const cmd = commands[i++];
    console.log(`Executing: ${cmd.substring(0, 50)}...`);
    
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
