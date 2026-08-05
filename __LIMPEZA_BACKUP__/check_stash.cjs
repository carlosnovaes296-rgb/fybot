const { Client } = require('ssh2');
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
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        out += data;
        process.stderr.write(data.toString());
      });
    });
  });
};

conn.on('ready', async () => {
  console.log('✅ Conectado ao servidor VPS.');
  try {
    console.log('🔎 Verificando a lixeira de salvamentos (git stash)...');
    let targetDir = '/root/carlosnovaes296-rgb/fybot';
    const checkDir = await runCmd(`ls -d /root/*fybot* 2>/dev/null | head -n 1`);
    if (checkDir.trim()) {
        targetDir = checkDir.trim();
    }
    await runCmd(`cd "${targetDir}" && git stash list`);
    console.log('\n=============================================');
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
