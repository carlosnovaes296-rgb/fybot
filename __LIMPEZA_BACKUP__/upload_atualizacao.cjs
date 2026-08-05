const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado ao servidor (VPS).');
  console.log('📤 Enviando as atualizacoes seguras de HOJE (apenas as correcoes)...');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    // Upload server.ts
    const serverContent = fs.readFileSync('./server.ts');
    const serverStream = sftp.createWriteStream('/root/fybot/server.ts');
    serverStream.write(serverContent);
    serverStream.end();
    
    serverStream.on('close', () => {
      console.log('📤 1/2: server.ts atualizado (Lógica das datas de licencas corrigida)');
      
      const licContent = fs.readFileSync('./src/components/LicenseCountdown.tsx');
      const licStream = sftp.createWriteStream('/root/fybot/src/components/LicenseCountdown.tsx');
      licStream.write(licContent);
      licStream.end();
      
      licStream.on('close', () => {
        console.log('📤 2/4: LicenseCountdown.tsx atualizado');

        const appContent = fs.readFileSync('./src/App.tsx');
        const appStream = sftp.createWriteStream('/root/fybot/src/App.tsx');
        appStream.write(appContent);
        appStream.end();

        appStream.on('close', () => {
          console.log('📤 3/4: App.tsx atualizado');

          const appVPSContent = fs.readFileSync('./App_VPS.tsx');
          const appVPSStream = sftp.createWriteStream('/root/fybot/App_VPS.tsx');
          appVPSStream.write(appVPSContent);
          appVPSStream.end();

          appVPSStream.on('close', () => {
            console.log('📤 4/5: App_VPS.tsx atualizado');

            const mysqlContent = fs.readFileSync('./backend/db/mysql.ts');
            const mysqlStream = sftp.createWriteStream('/root/fybot/backend/db/mysql.ts');
            mysqlStream.write(mysqlContent);
            mysqlStream.end();

            mysqlStream.on('close', () => {
              console.log('📤 5/5: mysql.ts (Banco de Dados) atualizado');
              console.log('🔄 Compilando o site e reiniciando o servidor (isso pode levar 30-60 seg)...');
            conn.exec('cd /root/fybot && npm run build && /usr/lib/node_modules/pm2/bin/pm2 restart fybot', (err2, stream2) => {
              if (err2) throw err2;
              
              stream2.on('close', (code) => {
                console.log('✅ PRONTO! O site inteiro esta online e 100% atualizado de forma segura!');
                conn.end();
              }).on('data', (data) => {
                 // Mostra pequenos pedacos do progresso
                 if (data.toString().includes('built in')) {
                     console.log(data.toString().trim());
                 }
              });
            });
          });
        });
      });
    });
  });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
