const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();

const runCmd = (cmd) => {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('close', (code, signal) => {
        resolve(out);
      }).on('data', (data) => {
        out += data;
      }).stderr.on('data', (data) => {
        out += data;
      });
    });
  });
};

conn.on('ready', async () => {
  try {
    const targetDir = '/root/fybot';
    const content = await runCmd(`cd "${targetDir}" && cat src/components/DailyTargetSystem.tsx`);
    fs.writeFileSync('./DailyTargetSystem_VPS.tsx', content);
    console.log('✅ Salvo como DailyTargetSystem_VPS.tsx');
  } catch (e) {
    console.error('❌ ERRO:', e);
  }
  conn.end();
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
