const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado ao servidor VPS.');
  console.log('📤 Enviando todos os 10 arquivos corrigidos (incluindo Webhook MT5, backend, e frontend)...');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    // 1. DerivConnectionManager
    let stream1 = sftp.createWriteStream('/root/fybot/backend/services/DerivConnectionManager.ts');
    stream1.write(fs.readFileSync('./backend/services/DerivConnectionManager.ts'));
    stream1.end();
    
    // 2. DerivBotEngine
    let stream2 = sftp.createWriteStream('/root/fybot/backend/services/DerivBotEngine.ts');
    stream2.write(fs.readFileSync('./backend/services/DerivBotEngine.ts'));
    stream2.end();
    
    // 3. server.ts
    let stream3 = sftp.createWriteStream('/root/fybot/server.ts');
    stream3.write(fs.readFileSync('./server.ts'));
    stream3.end();

    // 4. App.tsx
    let stream4 = sftp.createWriteStream('/root/fybot/src/App.tsx');
    stream4.write(fs.readFileSync('./src/App.tsx'));
    stream4.end();

    // 5. TradingChart.tsx
    let stream5 = sftp.createWriteStream('/root/fybot/src/components/TradingChart.tsx');
    stream5.write(fs.readFileSync('./src/components/TradingChart.tsx'));
    stream5.end();

    // 6. config.ts (APP_ID corrigido)
    let stream6 = sftp.createWriteStream('/root/fybot/src/config.ts');
    stream6.write(fs.readFileSync('./src/config.ts'));
    stream6.end();

    // 7. TradingScheduleTimer.tsx
    let stream7 = sftp.createWriteStream('/root/fybot/src/components/TradingScheduleTimer.tsx');
    stream7.write(fs.readFileSync('./src/components/TradingScheduleTimer.tsx'));
    stream7.end();

    // 8. DerivBotEngineEMA.ts
    let stream8 = sftp.createWriteStream('/root/fybot/DerivBotEngineEMA.ts');
    stream8.write(fs.readFileSync('./DerivBotEngineEMA.ts'));
    stream8.end();

    // 9. Fybot_Pro.mq5
    let stream9 = sftp.createWriteStream('/root/fybot/public/Fybot_Pro.mq5');
    stream9.write(fs.readFileSync('./public/Fybot_Pro.mq5'));
    stream9.end();

    // 10. LicenseCountdown.tsx
    let stream10 = sftp.createWriteStream('/root/fybot/src/components/LicenseCountdown.tsx');
    stream10.write(fs.readFileSync('./src/components/LicenseCountdown.tsx'));
    stream10.end();

    const TOTAL = 10;
    let finished = 0;
    const checkDone = () => {
        finished++;
        if (finished === TOTAL) {
           console.log(`📤 Todos os ${TOTAL} arquivos enviados com sucesso!`);
           console.log('🔄 Reconstruindo o site na VPS e reiniciando TODOS os processos backend...');
           conn.exec('cd /root/fybot && NODE_OPTIONS=--max-old-space-size=1024 npm run build && /usr/lib/node_modules/pm2/bin/pm2 restart all', (err2, streamCmd) => {
             if (err2) throw err2;
             streamCmd.on('close', (code) => {
               console.log('✅ PRONTO! Servidor 100% atualizado com a Rota do Webhook!');
               conn.end();
             }).on('data', (data) => {
                if (data.toString().includes('built in')) {
                    console.log(data.toString().trim());
                }
             }).stderr.on('data', (data) => {});
           });
        }
    };
    
    stream1.on('close', checkDone);
    stream2.on('close', checkDone);
    stream3.on('close', checkDone);
    stream4.on('close', checkDone);
    stream5.on('close', checkDone);
    stream6.on('close', checkDone);
    stream7.on('close', checkDone);
    stream8.on('close', checkDone);
    stream9.on('close', checkDone);
    stream10.on('close', checkDone);
  });
}).on('error', (err) => {
  console.log('❌ Erro de Conexão:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 120000,
  keepaliveInterval: 10000
});
