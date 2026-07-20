const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();

const filesToDownload = [
  { remote: '/root/fybot/server.ts', local: './server.ts' },
  { remote: '/root/fybot/src/App.tsx', local: './src/App.tsx' },
  { remote: '/root/fybot/src/components/DailyTargetSystem.tsx', local: './src/components/DailyTargetSystem.tsx' },
  { remote: '/root/fybot/src/translations.ts', local: './src/translations.ts' },
  { remote: '/root/fybot/src/types.ts', local: './src/types.ts' }
];

conn.on('ready', async () => {
  console.log('✅ Conectado ao servidor VPS.');
  try {
    const sftp = await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) reject(err);
        else resolve(sftp);
      });
    });

    for (let file of filesToDownload) {
      console.log(`📥 Baixando ${file.remote} -> ${file.local}...`);
      await new Promise((resolve, reject) => {
        sftp.fastGet(file.remote, file.local, (err) => {
          if (err) {
             console.error(`⚠️ Falha ao baixar ${file.remote}: ${err.message}. Pulando...`);
             resolve(); // Continua para os próximos arquivos mesmo se um falhar
          } else {
             resolve();
          }
        });
      });
    }

    console.log('\n🎉 SINCRONIZAÇÃO COMPLETA! Seus arquivos locais foram atualizados com o código correto da VPS. 🎉');
  } catch (e) {
    console.error('❌ ERRO:', e.message);
  }
  conn.end();
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
