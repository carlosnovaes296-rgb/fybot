const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado ao servidor (VPS).');
  console.log('🧹 Limpando TODO o histórico de licenças gerado pelos testes...');
  
  const scriptRemoto = `
    const fs = require('fs');
    const dbPath = '/root/fybot/backend/db/db.json';
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const totalExcluidas = db.licenses ? db.licenses.length : 0;
    
    // Zera todas as licencas
    db.licenses = [];
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('Sucesso: ' + totalExcluidas + ' licencas de teste foram excluidas!');
  `;

  conn.exec(`node -e "${scriptRemoto.replace(/"/g, '\\"').replace(/\n/g, ' ')}" && /usr/lib/node_modules/pm2/bin/pm2 restart fybot`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('✅ A tela "Registro de Licenças" agora esta 100% vazia e pronta para uso real.');
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
