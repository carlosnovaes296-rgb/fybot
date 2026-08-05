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
    let targetDir = '/root/carlosnovaes296-rgb/fybot'; 
    const checkDir = await runCmd(`ls -d /root/*fybot* 2>/dev/null | head -n 1`);
    if (checkDir.trim()) targetDir = checkDir.trim();

    console.log('📂 Projeto encontrado. Iniciando o RESGATE TOTAL...');
    
    // Desfaz o git pull usando o ORIG_HEAD (estado antes do pull)
    console.log('⏪ Desfazendo a atualizacao do GitHub...');
    await runCmd(`cd "${targetDir}" && git reset --hard ORIG_HEAD`);
    
    // Tira os arquivos locais que o cliente fez do "cofre" (stash)
    console.log('🔓 Tirando as suas alteracoes do cofre de seguranca...');
    await runCmd(`cd "${targetDir}" && git stash pop`);
    
    console.log('📦 Reconstruindo o site com os seus arquivos de volta...');
    await runCmd(`cd "${targetDir}" && npm run build`);
    
    console.log('🚀 Reiniciando a maquina...');
    await runCmd(`pm2 restart all`);
    
    console.log('\n=============================================');
    console.log('🎉 RESGATE CONCLUIDO! NADA FOI PERDIDO! 🎉');
    console.log('=============================================');
    console.log('Todos os seus dias de trabalho voltaram para a tela!');
    console.log('Pode abrir o fybot.life e apertar F5.');
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
