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

const commands = [
  'export DEBIAN_FRONTEND=noninteractive; dpkg --configure -a --force-confdef --force-confold || true',
  'export DEBIAN_FRONTEND=noninteractive; apt-get update -y',
  'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -',
  'apt-get install -y nodejs git',
  'npm install -g pm2',
  'rm -rf /root/fybot', // Clean up just in case
  'git clone https://github.com/carlosnovaes296-rgb/fybot.git /root/fybot',
  'echo \'MONGO_URI=\"mongodb+srv://admin:1BJPkXYBRk2026%4026H@db-mdb-nyc1-44873-366e470d.mongo.ondigitalocean.com/fybot?tls=true&authSource=admin\"\' > /root/fybot/.env',
  'cd /root/fybot && npm install',
  'cd /root/fybot && npm run build',
  'cd /root/fybot && pm2 start server.ts --name fybot --interpreter ./node_modules/.bin/tsx',
  'pm2 save'
];

conn.on('ready', () => {
  console.log('SSH Connection Established. Running deployment commands...');
  
  let i = 0;
  
  const runNext = () => {
    if (i >= commands.length) {
      console.log('Deployment completed successfully!');
      conn.end();
      return;
    }
    
    const cmd = commands[i++];
    console.log(`Executing: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(`Error executing ${cmd}: ${err}`);
        conn.end();
        return;
      }
      
      stream.on('close', (code, signal) => {
        console.log(`Command ${cmd} exited with code ${code}`);
        if (code !== 0 && code !== null) {
          console.error(`Command failed. Stopping.`);
          conn.end();
          return;
        }
        runNext();
      }).on('data', (data) => {
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  };
  
  runNext();
}).on('error', (err) => {
  console.error('SSH Connection Error: ' + err);
}).connect(config);
