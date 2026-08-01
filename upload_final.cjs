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
    console.log('📤 Enviando o App.tsx LIMPO (Somente Gráfico Azul e Token Deriv)...');
    await uploadFile('./src/App.tsx', '/root/fybot/src/App.tsx');
    
    console.log('📤 Enviando o DailyTargetSystem...');
    await uploadFile('./DailyTargetSystem.tsx', '/root/fybot/src/components/DailyTargetSystem.tsx');
    
    console.log('📤 Enviando o TradingChart.tsx (o Gráfico Azul que estava faltando!)...');
    await uploadFile('./src/components/TradingChart.tsx', '/root/fybot/src/components/TradingChart.tsx');
    
    console.log('🛠 Consertando a conexão da Deriv no Backend...');
    await runCmd(`sed -i 's/binaryws.com/derivws.com/g' /root/fybot/backend/websocket/derivSocket.ts || true`);
    await runCmd(`sed -i 's/binaryws.com/derivws.com/g' /root/fybot/src/App.tsx || true`);
    
    console.log('⚙️ Configurando memória (Swap) para não travar...');
    await runCmd(`fallocate -l 1G /swapfile || true`);
    await runCmd(`chmod 600 /swapfile || true`);
    await runCmd(`mkswap /swapfile || true`);
    await runCmd(`swapon /swapfile || true`);

    console.log('📦 Reconstruindo o site (isso pode demorar uns 2 minutos, tenha paciência)...');
    await runCmd(`cd /root/fybot && NODE_OPTIONS=--max-old-space-size=1024 npm run build`);
    
    console.log('🚀 Reiniciando o motor...');
    await runCmd(`pm2 restart all`);
    
    console.log('\n=============================================');
    console.log('🎉 TUDO PRONTO! O SITE ESTÁ PERFEITO! 🎉');
    console.log('=============================================');
  } catch (e) {
    console.log('\n=============================================');
    console.error('❌ OCORREU UM ERRO GRAVE NO UPLOAD OU NO BUILD!');
    console.error(e.message);
    console.log('=============================================');
    console.log('Por favor, tire um print desta tela preta inteira e mande para o programador!');
  }
  conn.end();
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
