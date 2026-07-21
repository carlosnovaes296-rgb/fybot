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
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  });
};

conn.on('ready', async () => {
  console.log('✅ SSH Conectado. Reiniciando o Servidor à força...');
  
  try {
    await runCmd('/usr/lib/node_modules/pm2/bin/pm2 restart all');
    console.log('\n--- PM2 REINICIADO ---');
    await runCmd('/usr/lib/node_modules/pm2/bin/pm2 status');

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
