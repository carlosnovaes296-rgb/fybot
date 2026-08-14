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
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

conn.on('ready', async () => {
  console.log('✅ Connected to VPS.');
  try {
    console.log('🛑 Releasing port 3000 and cleaning dist...');
    // Kill anything on port 3000 immediately (no PM2 hanging!) and recreate folders
    await runCmd('fuser -k 3000/tcp || true').catch(() => {});
    await runCmd('rm -rf /root/fybot/dist && mkdir -p /root/fybot/dist/assets /root/fybot/dist/downloads').catch(() => {});

    conn.sftp(async (err, sftp) => {
      if (err) {
        console.error('❌ SFTP Error:', err);
        conn.end();
        return;
      }

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
        console.log(`Sending ${i + 1}/${distFiles.length}: ${file.local} -> ${file.remote}...`);
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

      console.log('🚀 Restarting PM2 server in Production Mode...');
      try {
        await runCmd('pm2 delete all || true').catch(() => {});
        await runCmd('cd /root/fybot && NODE_ENV=production pm2 start "npx tsx server.ts" --name "fybot"');
        await runCmd('pm2 save');
        console.log('✅ Server started and saved in PM2.');
      } catch (pm2Err) {
        console.error('🚨 PM2 start failed:', pm2Err.message);
      }

      console.log('\n=============================================');
      console.log('🎉 DIST UPLOADED & PRODUCTION RESTARTED! 🎉');
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
