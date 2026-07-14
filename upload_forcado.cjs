const { Client } = require('ssh2');
const conn = new Client();

const runCmd = (cmd) => {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('close', (code, signal) => {
        if (code !== 0) {
           console.log(`❌ COMANDO FALHOU COM CÓDIGO ${code}: ${cmd}`);
           reject(new Error(`Exit code ${code}`));
        } else {
           resolve(out);
        }
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

const uploadFile = (localPath, remotePath) => {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
};

conn.on('ready', async () => {
  console.log('✅ Conectado ao servidor VPS.');
  try {
    console.log('📤 0. Enviando o Proxy (server.ts)...');
    await uploadFile('./server.ts', '/root/fybot/server.ts');
    
    console.log('📤 1. Enviando o App.tsx LIMPO...');
    await uploadFile('./src/App.tsx', '/root/fybot/src/App.tsx');
    
    console.log('📤 1.5. Enviando o translations.ts...');
    await uploadFile('./src/translations.ts', '/root/fybot/src/translations.ts');
    
    console.log('📤 2. Enviando o DailyTargetSystem...');
    await uploadFile('./src/components/DailyTargetSystem.tsx', '/root/fybot/src/components/DailyTargetSystem.tsx');
    
    console.log('📤 3. Enviando o TradingChart.tsx (o Gráfico Azul!)...');
    await uploadFile('./src/components/TradingChart.tsx', '/root/fybot/src/components/TradingChart.tsx');
    
    console.log('🔍 Checando se o arquivo TradingChart chegou no VPS...');
    const lsOut = await runCmd('ls -la /root/fybot/src/components/ || true');
    console.log('Conteúdo da pasta components no VPS:\n', lsOut);

    console.log('🛠 Limpando dependências ou caches se necessário...');
    // As linhas de sed foram removidas para não quebrar a API V2 da Deriv!
    console.log('⚙️ Instalando biblioteca do gráfico azul (lightweight-charts)...');
    await runCmd(`cd /root/fybot && npm install lightweight-charts`);

    console.log('📦 Reconstruindo o site...');
    await runCmd(`cd /root/fybot && NODE_OPTIONS=--max-old-space-size=1024 npm run build`);
    
    console.log('🛡️ Arrumando o Nginx do VPS para suportar WebSockets no Túnel...');
    await runCmd(`
      # Adiciona os cabeçalhos de WebSocket se eles não existirem
      for file in /etc/nginx/sites-available/*; do
        if grep -q "proxy_pass http://localhost:3000;" "$file"; then
          if ! grep -q "Upgrade" "$file"; then
            sed -i '/proxy_pass http:\\/\\/localhost:3000;/a \\        proxy_set_header Upgrade $http_upgrade;\\n        proxy_set_header Connection "upgrade";' "$file"
          fi
        fi
      done
      systemctl reload nginx || true
    `);

    console.log('🚀 Reiniciando o motor...');
    await runCmd(`pm2 restart all`);
    
    console.log('\n=============================================');
    console.log('🎉 TUDO PRONTO! O SITE ESTÁ PERFEITO! 🎉');
    console.log('=============================================');
  } catch (e) {
    console.log('\n=============================================');
    console.error('❌ ERRO DURANTE O UPLOAD/BUILD:');
    console.error(e.message);
    console.log('=============================================');
  }
  conn.end();
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
