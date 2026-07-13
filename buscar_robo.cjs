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
    console.log('🔎 Procurando onde esta a foto do robo ("TÔ DE VOLTA")...');
    await runCmd(`grep -rn "TÔ DE VOLTA" /root /var/www /home --exclude-dir=node_modules`);
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
