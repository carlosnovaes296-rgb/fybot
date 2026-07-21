const { Client } = require('ssh2');

const conn = new Client();

const runCmd = (cmd) => {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('close', (code) => {
        resolve(out);
      }).on('data', (data) => {
        out += data.toString();
      }).stderr.on('data', (data) => {
        out += data.toString();
      });
    });
  });
};

conn.on('ready', async () => {
  console.log('✅ SSH Conectado na VPS. Buscando os logs do PM2...');
  
  try {
    const status = await runCmd('/usr/lib/node_modules/pm2/bin/pm2 status');
    console.log('\n--- STATUS DO PM2 ---');
    console.log(status);

    const logs = await runCmd('/usr/lib/node_modules/pm2/bin/pm2 logs --lines 50 --nostream');
    console.log('\n--- LOGS DO MOTOR ---');
    console.log(logs);

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
