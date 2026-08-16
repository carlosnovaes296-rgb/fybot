const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();

const runCmd = (cmd) => {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('close', (code) => {
        if (code !== 0) {
           reject(new Error(`Exit code ${code} for cmd: ${cmd}`));
        } else {
           resolve(out);
        }
      }).on('data', (data) => {
        out += data;
      }).stderr.on('data', (data) => {
        out += data;
      });
    });
  });
};

const uploadFile = (sftp, localPath, remotePath) => {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(localPath);
    const writeStream = sftp.createWriteStream(remotePath);
    
    writeStream.on('close', () => {
      resolve();
    });
    
    writeStream.on('error', (err) => {
      reject(err);
    });
    
    readStream.on('error', (err) => {
      reject(err);
    });
    
    readStream.pipe(writeStream);
  });
};

conn.on('ready', async () => {
  console.log('✅ Connected to VPS.');
  try {
    console.log('🛑 Cleaning PM2 and old processes...');
    // Safely delete PM2 processes first
    await runCmd('pm2 delete all || true').catch(() => {});
    // Kill port 3000 using fuser/lsof/kill
    await runCmd('fuser -k 3000/tcp || kill -9 $(lsof -t -i:3000) || true').catch(() => {});
    
    console.log('🧹 Recreating remote dist directories...');
    await runCmd('rm -rf /root/fybot/dist && mkdir -p /root/fybot/dist/assets /root/fybot/dist/downloads').catch(() => {});

    conn.sftp(async (err, sftp) => {
      if (err) {
        console.error('❌ SFTP Error:', err);
        conn.end();
        return;
      }

      // 1. Upload Backend Files
      const backendFiles = [
        { local: './server.ts', remote: '/root/fybot/server.ts' },
        { local: './backend/db/mysql.ts', remote: '/root/fybot/backend/db/mysql.ts' },
        { local: './backend/services/DerivConnectionManager.ts', remote: '/root/fybot/backend/services/DerivConnectionManager.ts' },
        { local: './backend/services/DerivBotEngine.ts', remote: '/root/fybot/backend/services/DerivBotEngine.ts' },
        { local: './.env', remote: '/root/fybot/.env' }
      ];

      console.log('📤 Uploading backend files...');
      for (const file of backendFiles) {
        console.log(`Sending backend: ${file.local} -> ${file.remote}...`);
        try {
          await uploadFile(sftp, file.local, file.remote);
        } catch (uploadErr) {
          console.error(`❌ Failed to upload ${file.local}:`, uploadErr.message);
          sftp.end();
          conn.end();
          return;
        }
      }

      // 2. Scan and Upload dist Files
      console.log('📤 Scanning local dist files...');
      const distFiles = [];
      
      const scanDir = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else {
            const relPath = path.relative(path.join(__dirname, 'dist'), fullPath).replace(/\\/g, '/');
            distFiles.push({
              local: fullPath,
              remote: `/root/fybot/dist/${relPath}`
            });
          }
        }
      };

      if (!fs.existsSync(path.join(__dirname, 'dist'))) {
        console.error('❌ Local dist directory not found! Please run "npm run build" locally first.');
        sftp.end();
        conn.end();
        return;
      }

      scanDir(path.join(__dirname, 'dist'));

      console.log(`📤 Uploading ${distFiles.length} build files...`);
      for (let i = 0; i < distFiles.length; i++) {
        const file = distFiles[i];
        console.log(`Sending dist ${i + 1}/${distFiles.length}: ${file.local} -> ${file.remote}...`);
        try {
          await uploadFile(sftp, file.local, file.remote);
        } catch (uploadErr) {
          console.error(`❌ Failed to upload ${file.local}:`, uploadErr.message);
          sftp.end();
          conn.end();
          return;
        }
      }
      sftp.end();

      console.log('🚀 Starting PM2 server in Production Mode...');
      try {
        await runCmd('cd /root/fybot && NODE_ENV=production pm2 start "npx tsx server.ts" --name "fybot"');
        await runCmd('pm2 save');
        console.log('✅ Server started and saved in PM2.');
      } catch (pm2Err) {
        console.error('🚨 PM2 start failed:', pm2Err.message);
      }

      console.log('\n=============================================');
      console.log('🎉 DEPLOY SUCCESSFUL! WEBSITE IS ONLINE! 🎉');
      console.log('=============================================');
      conn.end();
    });
  } catch (e) {
    console.error('❌ CRITICAL ERROR:', e.message);
    conn.end();
  }
}).on('error', (err) => {
  console.error('❌ Connection Error:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
