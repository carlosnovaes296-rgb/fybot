const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado ao VPS. Analisando repositório Git para recuperação...');
  
  // Vamos rodar git status, git log para ver os commits locais, e git stash list
  conn.exec(`cd /root/fybot && echo "=== GIT STATUS ===" && git status && echo "=== GIT LOG ===" && git log -n 5 --oneline && echo "=== GIT STASH LIST ===" && git stash list`, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d.toString()))
          .on('close', () => conn.end())
          .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
