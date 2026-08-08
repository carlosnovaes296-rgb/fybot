const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();

const filesToUpload = [
    { local: './backend/services/DerivConnectionManager.ts', remote: '/root/fybot/backend/services/DerivConnectionManager.ts' },
    { local: './backend/services/DerivBotEngine.ts', remote: '/root/fybot/backend/services/DerivBotEngine.ts' },
    { local: './server.ts', remote: '/root/fybot/server.ts' },
    { local: './src/App.tsx', remote: '/root/fybot/src/App.tsx' },
    { local: './src/components/TradingChart.tsx', remote: '/root/fybot/src/components/TradingChart.tsx' },
    { local: './src/config.ts', remote: '/root/fybot/src/config.ts' },
    { local: './src/components/TradingScheduleTimer.tsx', remote: '/root/fybot/src/components/TradingScheduleTimer.tsx' },
    { local: './DerivBotEngineEMA.ts', remote: '/root/fybot/DerivBotEngineEMA.ts' },
    { local: './Fybot_Pro.mq5', remote: '/root/fybot/public/Fybot_Pro.mq5' },
    { local: './src/components/LicenseCountdown.tsx', remote: '/root/fybot/src/components/LicenseCountdown.tsx' },
    { local: './src/translations.ts', remote: '/root/fybot/src/translations.ts' },
    { local: './public/snaper1x1.png.png', remote: '/root/fybot/public/snaper1x1.png.png' },
    { local: './Fybot_Sniper.mq5', remote: '/root/fybot/public/Fybot_Sniper.mq5' }
];

conn.on('ready', () => {
  console.log('✅ Conectado ao servidor VPS.');
  console.log('📤 Enviando todos os 13 arquivos corrigidos (Modo Fila Indiana para não travar a VPS)...');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    let currentIndex = 0;

    const uploadNext = () => {
        if (currentIndex >= filesToUpload.length) {
            console.log(`📤 Todos os ${filesToUpload.length} arquivos enviados com sucesso!`);
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
              }).stderr.on('data', (data) => {
                  console.log('🚨 ERRO NO BUILD DA VPS:', data.toString());
              });
            });
            return;
        }

        const file = filesToUpload[currentIndex];
        console.log(`Enviando ${currentIndex + 1}/${filesToUpload.length}: ${file.local}...`);
        
        let writeStream = sftp.createWriteStream(file.remote);
        
        writeStream.on('close', () => {
            currentIndex++;
            uploadNext(); // Chama o próximo arquivo
        });

        writeStream.on('error', (err) => {
            console.log(`❌ Erro ao enviar arquivo ${file.local}:`, err);
            conn.end();
        });

        writeStream.write(fs.readFileSync(file.local));
        writeStream.end();
    };

    // Inicia a fila
    uploadNext();
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
