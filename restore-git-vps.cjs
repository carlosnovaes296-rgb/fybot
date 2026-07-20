const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado ao VPS. Iniciando restauração do código de ontem...');
  
  // 1. Reseta as alterações locais (descarta os arquivos antigos que enviamos)
  // 2. Aplica o Stash mais recente (stash@{0}) para recuperar o trabalho de ontem
  // 3. Executa o build e reinicia o PM2
  const cmd = `cd /root/fybot && git reset --hard HEAD && git stash apply stash@{0} && npm run build && pm2 restart all`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d.toString()))
          .on('close', () => {
             console.log("\n🎉 CÓDIGO DE ONTEM RESTAURADO NA VPS COM SUCESSO! 🎉");
             conn.end();
          })
          .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
