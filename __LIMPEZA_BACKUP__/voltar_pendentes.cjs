const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado ao servidor (VPS).');
  console.log('🔄 Restaurando os pagamentos de CANCELED para PENDING...');
  
  // Script que vai rodar lá dentro do servidor
  const scriptRemoto = `
    const fs = require('fs');
    const dbPath = '/root/fybot/backend/db/db.json';
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    let count = 0;
    if (db.payments) {
      db.payments.forEach(p => {
        if (p.status === 'CANCELED') {
          p.status = 'PENDING';
          count++;
        }
      });
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    }
    console.log('Foram restaurados ' + count + ' pagamentos.');
  `;

  // Executa o script no servidor e reinicia
  conn.exec(`node -e "${scriptRemoto.replace(/"/g, '\\"').replace(/\n/g, ' ')}" && /usr/lib/node_modules/pm2/bin/pm2 restart fybot`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('✅ Tudo pronto! Pode atualizar sua pagina e testar as outras licencas.');
      conn.end();
    }).on('data', (data) => {
      const msg = data.toString().trim();
      if(msg && !msg.includes('built in')) console.log(msg);
    });
  });
}).on('error', (err) => {
  console.error('Erro:', err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
