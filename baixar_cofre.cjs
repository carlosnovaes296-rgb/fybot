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
    const targetDir = '/root/fybot';
    
    // Lista os arquivos e salva localmente para o agente ver
    const files = await runCmd(`cd "${targetDir}" && git stash show --name-only stash@{0}`);
    fs.writeFileSync('./stash_files.txt', files);
    console.log('✅ Arquivos identificados:');
    console.log(files);
    
    // Para cada arquivo modificado no stash, exportar do stash
    const fileList = files.trim().split('\n');
    for (const file of fileList) {
      if (file) {
        console.log(`📥 Baixando ${file}...`);
        const content = await runCmd(`cd "${targetDir}" && git show stash@{0}:${file}`);
        // Save locally for the AI to read
        const safeName = file.replace(/\\//g, '_');
        fs.writeFileSync(`./stash_${safeName}`, content);
      }
    }
    
    console.log('\n✅ Pronto! Baixei tudo do cofre em seguranca.');
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
