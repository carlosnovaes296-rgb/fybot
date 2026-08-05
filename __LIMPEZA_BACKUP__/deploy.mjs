import fs from 'fs';
import path from 'path';
import { NodeSSH } from 'node-ssh';
import AdmZip from 'adm-zip';

const ssh = new NodeSSH();

async function deploy() {
  console.log('Zipping project...');
  const zip = new AdmZip();
  const dir = process.cwd();
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (['node_modules', '.git', 'dist', 'data', 'deploy.mjs', 'iabot_codigo.zip', 'fybot_codigo.zip'].includes(item)) continue;
    
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      zip.addLocalFolder(fullPath, item);
    } else {
      zip.addLocalFile(fullPath);
    }
  }
  
  const zipPath = path.join(dir, 'deploy.zip');
  zip.writeZip(zipPath);
  console.log('Project zipped successfully.');

  console.log('Connecting to SSH...');
  await ssh.connect({
    host: '143.198.173.250',
    username: 'root',
    password: '1BJPkXYBRk2026@26H',
    readyTimeout: 60000
  });
  console.log('Connected!');

  console.log('Uploading zip...');
  await ssh.putFile(zipPath, '/root/deploy.zip');
  console.log('Upload complete.');

  console.log('Setting up environment...');
  const setupCommands = [
    'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -',
    'apt-get install -y nodejs unzip',
    'npm install -g pm2',
    'mkdir -p /var/www/fybot',
    'mv /root/deploy.zip /var/www/fybot/',
    'cd /var/www/fybot && unzip -o deploy.zip',
    'cd /var/www/fybot && rm deploy.zip',
    'cd /var/www/fybot && npm install',
    'cd /var/www/fybot && npm run build',
    'pm2 stop fybot || true',
    'cd /var/www/fybot && pm2 start npm --name "fybot" -- start',
    'pm2 save'
  ];

  for (const cmd of setupCommands) {
    console.log(`Executing: ${cmd}`);
    const res = await ssh.execCommand(cmd, { cwd: '/root' });
    console.log('STDOUT: ' + res.stdout.substring(0, 500)); // Truncate to avoid massive logs
    if (res.stderr) console.error('STDERR: ' + res.stderr.substring(0, 500));
  }

  console.log('Deployment complete!');
  ssh.dispose();
  fs.unlinkSync(zipPath);
}

deploy().catch(err => {
  console.error(err);
  process.exit(1);
});
