const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const dbPath = path.join(__dirname, 'data', 'db.json');

const seedScript = `
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function seed() {
  if (!process.env.MYSQL_URL) {
    console.log('No MYSQL_URL, using local db.json instead.');
    process.exit(0);
  }
  try {
    const pool = mysql.createPool(process.env.MYSQL_URL);
    const data = fs.readFileSync(__dirname + '/data/db.json', 'utf-8');
    await pool.execute('INSERT INTO fybot_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = ?', [data, data]);
    console.log('MySQL successfully seeded from db.json!');
  } catch (err) {
    console.error('Error seeding MySQL:', err);
  }
  process.exit(0);
}
seed();
`;

fs.writeFileSync(path.join(__dirname, 'seed.cjs'), seedScript);

conn.on('ready', () => {
  console.log('✅ SSH Connected. Uploading database...');
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP error:', err); conn.end(); return; }
    
    if (!fs.existsSync(dbPath)) {
      console.error('❌ data/db.json não encontrado!');
      conn.end();
      return;
    }

    console.log('Parando o Fybot na VPS para segurança...');
    conn.exec('/usr/lib/node_modules/pm2/bin/pm2 stop fybot', (err) => {
      sftp.mkdir('/root/fybot/data', true, (err) => {
        console.log('Enviando data/db.json...');
        sftp.fastPut(dbPath, '/root/fybot/data/db.json', (err) => {
          if (err) console.error('Erro enviando db.json:', err);
          
          console.log('Enviando script de injeção (seed.cjs)...');
          sftp.fastPut(path.join(__dirname, 'seed.cjs'), '/root/fybot/seed.cjs', (err) => {
            
            console.log('Executando injeção no MySQL da VPS...');
            conn.exec('cd /root/fybot && node seed.cjs', (err, stream) => {
              if (err) { console.error(err); conn.end(); return; }
              stream.on('data', d => process.stdout.write(d))
                    .stderr.on('data', d => process.stderr.write(d));
              
              stream.on('close', () => {
                console.log('Reiniciando o Fybot...');
                conn.exec('/usr/lib/node_modules/pm2/bin/pm2 restart fybot', (err, stream) => {
                  stream.on('data', d => process.stdout.write(d));
                  stream.on('close', () => {
                    console.log('🎉 Bando de dados restaurado e enviado para o MySQL da VPS com sucesso!');
                    conn.end();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
