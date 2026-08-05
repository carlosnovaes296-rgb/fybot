const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('Conectado! Removendo verificação de senha...');
  // Remove password check: changes "user && user.password === password" to just "user"
  conn.exec(
    `sed -i "s/user && user\\.password === password/user/g" /root/fybot/server.ts && echo "SED OK" && pm2 restart fybot && echo "PM2 RESTARTED"`,
    (err, stream) => {
      if (err) throw err;
      stream
        .on('data', d => process.stdout.write(d.toString()))
        .stderr.on('data', d => process.stderr.write(d.toString()))
        .on('close', () => {
          console.log('\n========================================');
          console.log('FEITO! Agora entre no site com:');
          console.log('E-mail: carlosnovaes296@gmail.com');
          console.log('Senha:  qualquer coisa (ex: 123)');
          console.log('========================================');
          conn.end();
        });
    }
  );
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
