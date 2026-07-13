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
  console.log('✅ Conectado ao servidor VPS com sucesso!');
  try {
    console.log('🔎 Localizando pasta do projeto...');
    let targetDir = '/root/carlosnovaes296-rgb/fybot'; // Caminho provável com base no seu GitHub
    
    const checkDir = await runCmd(`ls -d /root/*fybot* 2>/dev/null | head -n 1`);
    if (checkDir.trim()) {
        targetDir = checkDir.trim();
    }

    console.log('📂 Projeto encontrado em: ' + targetDir);
    console.log('📥 Atualizando codigo pelo GitHub...');
    await runCmd(`cd "${targetDir}" && git stash && git pull origin main`);
    
    console.log('📦 Construindo os arquivos da tela nova (aguarde uns segundos)...');
    await runCmd(`cd "${targetDir}" && npm run build`);
    
    console.log('🚀 Reiniciando o motor na VPS...');
    await runCmd(`pm2 restart all`);
    
    console.log('\n=============================================');
    console.log('🎉 DEPLOY CONCLUIDO COM SUCESSO! 🎉');
    console.log('=============================================');
    console.log('O servidor foi atualizado e ja esta rodando.');
    console.log('Va no site fybot.life, aperte F5 para limpar a tela velha, cole o ID 33OOoMOd8uINCfNRFkSCR e seu token e de PLAY!');
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

conn.on('error', (err) => {
  console.error('❌ Erro de conexao SSH:', err.message);
});
