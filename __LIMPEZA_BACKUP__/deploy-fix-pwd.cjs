const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const scriptContent = fs.readFileSync(path.join(__dirname, 'fix-pwd-remote.js'), 'utf8');

conn.on('ready', () => {
  console.log('Conectado ao servidor. Enviando script...');

  // Escreve o script via stdin para evitar problemas de heredoc
  conn.exec(`cat > /tmp/fix-pwd.js && cd /root/fybot && node /tmp/fix-pwd.js && pm2 restart fybot`, (err, stream) => {
    if (err) throw err;
    
    stream
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()));
    
    stream.on('close', (code) => {
      console.log('\nScript finalizado com código:', code);
      conn.end();
    });
    
    // Envia o conteúdo do script via stdin
    stream.stdin.write(scriptContent);
    stream.stdin.end();
  });
}).connect({ 
  host: '209.97.163.75', 
  port: 22, 
  username: 'root', 
  password: '1BJPkXYBRk2026@26H', 
  readyTimeout: 20000 
});
