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
  console.log('✅ Conectado ao servidor VPS.');
  try {
    console.log('🔎 Procurando o caminho correto do seu App.tsx...');
    const findOut = await runCmd('find /root /var/www /home -name "App.tsx" 2>/dev/null | grep -i fybot | head -n 1');
    const targetFile = findOut.trim();
    
    if (!targetFile) {
        console.log('❌ Arquivo nao encontrado! O caminho esta muito diferente.');
        conn.end();
        return;
    }
    console.log('✅ Arquivo encontrado em: ' + targetFile);
    console.log('📥 Baixando...');
    
    const fileContent = await runCmd(`cat "${targetFile}"`);
    fs.writeFileSync('./App_VPS.tsx', fileContent);
    console.log('✅ Download concluído: App_VPS.tsx');
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
