const { Client } = require('ssh2');
const conn = new Client();

const filesToUpload = [
    { local: './backend/db/mysql.ts', remote: '/root/fybot/backend/db/mysql.ts' },
    { local: './backend/services/DerivConnectionManager.ts', remote: '/root/fybot/backend/services/DerivConnectionManager.ts' },
    { local: './backend/services/DerivBotEngine.ts', remote: '/root/fybot/backend/services/DerivBotEngine.ts' },
    { local: './server.ts', remote: '/root/fybot/server.ts' },
    { local: './src/App.tsx', remote: '/root/fybot/src/App.tsx' },
    { local: './src/components/TradingChart.tsx', remote: '/root/fybot/src/components/TradingChart.tsx' },
    { local: './src/config.ts', remote: '/root/fybot/src/config.ts' },
    { local: './src/components/TradingScheduleTimer.tsx', remote: '/root/fybot/src/components/TradingScheduleTimer.tsx' },
    { local: './Fybot_Pro.mq5', remote: '/root/fybot/public/Fybot_Pro.mq5' },
    { local: './src/components/LicenseCountdown.tsx', remote: '/root/fybot/src/components/LicenseCountdown.tsx' },
    { local: './src/translations.ts', remote: '/root/fybot/src/translations.ts' },
    { local: './public/snaper1x1.png.png', remote: '/root/fybot/public/snaper1x1.png.png' },
    { local: './Fybot_Sniper.mq5', remote: '/root/fybot/public/Fybot_Sniper.mq5' },
    { local: './.env', remote: '/root/fybot/.env' },
    { local: './src/components/PricingCard.tsx', remote: '/root/fybot/src/components/PricingCard.tsx' },
    { local: './src/components/NavItem.tsx', remote: '/root/fybot/src/components/NavItem.tsx' }
];

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
    // Force delete remote NavItem.tsx to avoid file lock issues
    console.log('🧹 Cleaning remote NavItem.tsx if it exists...');
    await runCmd('rm -f /root/fybot/src/components/NavItem.tsx').catch(() => {});

    conn.sftp(async (err, sftp) => {
      if (err) {
        console.error('❌ SFTP Error:', err);
        conn.end();
        return;
      }

      console.log(`📤 Starting upload of ${filesToUpload.length} files...`);
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        console.log(`Sending ${i + 1}/${filesToUpload.length}: ${file.local}...`);
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

      console.log('📦 Rebuilding the website on VPS...');
      try {
        await runCmd('cd /root/fybot && NODE_OPTIONS=--max-old-space-size=1024 npm run build');
        console.log('✅ Build successful.');
      } catch (buildErr) {
        console.error('🚨 Rebuild failed on VPS:', buildErr.message);
      }

      console.log('🚀 Restarting PM2 processes...');
      try {
        await runCmd('pm2 restart all');
        console.log('✅ All processes restarted successfully.');
      } catch (pm2Err) {
        console.error('🚨 PM2 restart failed:', pm2Err.message);
      }

      console.log('\n=============================================');
      console.log('🎉 DEPLOY COMPLETED SUCCESSFULLY! 🎉');
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
