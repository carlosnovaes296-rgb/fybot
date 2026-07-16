const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const BACKEND_DIR = path.join(__dirname, 'backend');
const SRC_DIR = path.join(__dirname, 'src');

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

if (fs.existsSync(SRC_DIR)) {
  const srcFiles = getAllFiles(SRC_DIR);
  srcFiles.forEach(file => {
    const relativePath = file.replace(__dirname, '').replace(/\\/g, '/');
    filesToUpload.push({ local: file, remote: `/root/fybot${relativePath}` });
  });
}

const runCmd = (cmd) => {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('close', (code) => {
        if (code !== 0) return reject(new Error(`Exit code ${code} - ${cmd}`));
        resolve(out);
      }).on('data', (data) => {
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  });
};

conn.on('ready', async () => {
  console.log('✅ SSH Conectado. Enviando Backend e Frontend...');
  
  try {
    const sftp = await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) reject(err);
        else resolve(sftp);
      });
    });

    const dirs = new Set();
    filesToUpload.forEach(f => dirs.add(path.dirname(f.remote)));
    const dirsArray = Array.from(dirs);
    
    await runCmd(`mkdir -p ${dirsArray.map(d => `"${d}"`).join(' ')}`);

    for (let file of filesToUpload) {
      console.log(`📤 Enviando ${file.remote}...`);
      await new Promise((resolve, reject) => {
        sftp.fastPut(file.local, file.remote, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    console.log('📦 Instalando dependências e Reconstruindo o site...');
    await runCmd(`cd /root/fybot && npm install && NODE_OPTIONS=--max-old-space-size=1024 npm run build`);
    
    console.log('🚀 Reiniciando o motor...');
    await runCmd(`/usr/lib/node_modules/pm2/bin/pm2 restart fybot || pm2 restart all`);
    
    console.log('\n🎉 TUDO PRONTO! TELA E SERVIDOR 100% ATUALIZADOS! 🎉');

  } catch (e) {
    console.error('❌ ERRO:', e.message);
  }
  conn.end();
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
