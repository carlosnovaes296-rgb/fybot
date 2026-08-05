const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const BACKEND_DIR = path.join(__dirname, 'backend');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
}

const filesToUpload = [
  { local: path.join(__dirname, 'server.ts'), remote: '/root/fybot/server.ts' },
  { local: path.join(__dirname, 'package.json'), remote: '/root/fybot/package.json' }
];

if (fs.existsSync(BACKEND_DIR)) {
  const backendFiles = getAllFiles(BACKEND_DIR);
  backendFiles.forEach(file => {
    const relativePath = file.replace(__dirname, '').replace(/\\/g, '/');
    filesToUpload.push({ local: file, remote: `/root/fybot${relativePath}` });
  });
}

conn.on('ready', () => {
  console.log('✅ SSH Connected. Uploading backend files...');
  conn.sftp((err, sftp) => {
    if (err) throw err;

    // First ensure backend directories exist
    const dirs = new Set();
    filesToUpload.forEach(f => dirs.add(path.dirname(f.remote)));
    const dirsArray = Array.from(dirs);
    
    // Create directories using exec mkdir -p which is reliable
    const mkdirCmd = `mkdir -p ${dirsArray.map(d => `"${d}"`).join(' ')}`;
    conn.exec(mkdirCmd, (err, stream) => {
      if (err) throw err;
      stream.resume(); // <--- Prevent stream from hanging
      stream.stderr.resume();
      stream.on('close', () => {
        let fileIndex = 0;
        function uploadNextFile() {
          if (fileIndex >= filesToUpload.length) {
            console.log('✅ All files uploaded! Installing npm packages and restarting...');
            conn.exec('cd /root/fybot && npm install && /usr/lib/node_modules/pm2/bin/pm2 restart fybot', (err, stream) => {
              if (err) throw err;
              stream.on('data', d => process.stdout.write(d))
                    .stderr.on('data', d => process.stderr.write(d));
              stream.on('close', () => {
                console.log('\n🎉 Done! Servidor Backend atualizado e reiniciado.');
                conn.end();
              });
            });
            return;
          }
          
          const file = filesToUpload[fileIndex++];
          console.log(`Uploading ${file.remote}...`);
          sftp.fastPut(file.local, file.remote, (err) => {
            if (err) console.error(`Error uploading ${file.remote}:`, err);
            uploadNextFile();
          });
        }
        uploadNextFile();
      });
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
