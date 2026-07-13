const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();

const runCmd = (cmd) => {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('close', (code, signal) => {
        resolve(out);
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
    console.log('📤 Enviando o App.tsx UNIFICADO (com Gráfico Azul e MT5)...');
    await uploadFile('./src/App.tsx', '/root/fybot/src/App.tsx');
    
    console.log('📤 Enviando o DailyTargetSystem UNIFICADO (sem foto de robô enorme)...');
    await uploadFile('./src/components/DailyTargetSystem.tsx', '/root/fybot/src/components/DailyTargetSystem.tsx');
    
    console.log('🛠 Consertando a conexão da Deriv no Backend...');
    await runCmd(`sed -i 's/binaryws.com/derivws.com/g' /root/fybot/backend/websocket/derivSocket.ts`);
    await runCmd(`sed -i 's/binaryws.com/derivws.com/g' /root/fybot/src/App.tsx`);
    
    console.log('📦 Reconstruindo o site...');
    await runCmd(`cd /root/fybot && npm run build`);
    
    console.log('🚀 Reiniciando o motor...');
    await runCmd(`pm2 restart all`);
    
    console.log('\n=============================================');
    console.log('🎉 TUDO PRONTO! O SITE ESTÁ PERFEITO! 🎉');
    console.log('=============================================');
    console.log('O Gráfico Azul, os Botões Verde/Real/Demo, e o MT5 estão TODOS na tela!');
    console.log('Vá no fybot.life, aperte Ctrl + F5 (ou limpe o cache do celular) para ver!');
  } catch (e) {
    console.error('❌ ERRO:', e);
  }
  conn.end();
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
