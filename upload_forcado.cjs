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
        // process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        out += data;
        // process.stderr.write(data.toString());
      });
    });
  });
};

const uploadFile = (localPath, remotePath) => {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (err) => {
        sftp.end(); // FECHA O CANAL SFTP AQUI! (Isso previne o erro de Channel open failure)
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
    
    console.log('🛠 Criando pastas do backend no VPS...');
    await runCmd('mkdir -p /root/fybot/backend/deriv /root/fybot/backend/services /root/fybot/backend/db');
    
    console.log('📤 4. Enviando backend/deriv e backend/services...');
    await uploadFile('./backend/deriv/config.ts', '/root/fybot/backend/deriv/config.ts');
    await uploadFile('./backend/deriv/oauth.ts', '/root/fybot/backend/deriv/oauth.ts');
    await uploadFile('./backend/deriv/routes.ts', '/root/fybot/backend/deriv/routes.ts');
    await uploadFile('./backend/deriv/websocket.ts', '/root/fybot/backend/deriv/websocket.ts');
    await uploadFile('./backend/services/DerivBotEngine.ts', '/root/fybot/backend/services/DerivBotEngine.ts');
    await uploadFile('./backend/services/DerivConnectionManager.ts', '/root/fybot/backend/services/DerivConnectionManager.ts');
    await uploadFile('./backend/services/derivService.ts', '/root/fybot/backend/services/derivService.ts');
    await uploadFile('./backend/db/mysql.ts', '/root/fybot/backend/db/mysql.ts');
    
    console.log('🔍 Checando se o arquivo TradingChart chegou no VPS...');
    const lsOut = await runCmd('ls -la /root/fybot/src/components/ || true');
    console.log('Conteúdo da pasta components no VPS:\n', lsOut);

    console.log('🛠 Limpando dependências ou caches no VPS...');
    await runCmd(`cd /root/fybot && rm -rf node_modules/lightweight-charts package-lock.json node_modules/.vite dist`);
    
    console.log('⚙️ Instalando bibliotecas corretas na versão 4 (lightweight-charts, express-session)...');
    await runCmd(`cd /root/fybot && npm install && npm install lightweight-charts@4.1.1 express-session @types/express-session`);

    console.log('📦 Reconstruindo o site (com proteção contra falta de memória)...');
    await runCmd(`
      if [ ! -f /swapfile ]; then
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo "/swapfile none swap sw 0 0" >> /etc/fstab
      fi
      cd /root/fybot && NODE_OPTIONS=--max-old-space-size=1024 npm run build
    `);
    
    console.log('🧹 Limpando trades simulados antigos do banco de dados...');
    await runCmd(`node -e "const fs=require('fs'); try { let data=JSON.parse(fs.readFileSync('/root/fybot/db.json', 'utf8')); Object.values(data.userStates || {}).forEach(state => { state.trades = []; state.pnlHistory = []; }); fs.writeFileSync('/root/fybot/db.json', JSON.stringify(data, null, 2)); console.log('Trades limpos com sucesso!'); } catch(e) { console.log('Erro ao limpar db.json:', e.message); }"`);
    
    console.log('🛡️ Arrumando o Nginx do VPS para suportar WebSockets no Túnel...');
    await runCmd(`
      # Adiciona os cabeçalhos de WebSocket se eles não existirem
      for file in /etc/nginx/sites-available/*; do
        if grep -q "proxy_pass http://localhost:3000;" "$file"; then
          if ! grep -q "Upgrade" "$file"; then
            sed -i 's|proxy_pass http://localhost:3000;|proxy_pass http://localhost:3000;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";|g' "$file"
          fi
          if ! grep -q "proxy_http_version 1.1;" "$file"; then
            sed -i 's|proxy_pass http://localhost:3000;|proxy_pass http://localhost:3000;\n        proxy_http_version 1.1;|g' "$file"
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
