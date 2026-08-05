const { Client } = require('ssh2');
const fs = require('fs');
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
      }).stderr.on('data', (data) => {
        out += data;
      });
    });
  });
};

const uploadFile = (localPath, remotePath) => {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (err) => {
        sftp.end();
        if (err) return reject(err);
        resolve();
      });
    });
  });
};

conn.on('ready', async () => {
  console.log('✅ Conectado ao VPS remotamente!');
  try {
    console.log('📤 Enviando o script de reajuste de datas para o VPS...');
    await uploadFile('./reajustar_datas_licencas.js', '/root/fybot/reajustar_datas_licencas.js');
    
    console.log('🧹 Executando o calculo e ajuste dos dias de todas as licencas...');
    const result = await runCmd('cd /root/fybot && node reajustar_datas_licencas.js');
    console.log(result);
    
    console.log('🔄 Reiniciando o servidor (PM2) para atualizar a interface...');
    await runCmd('/usr/lib/node_modules/pm2/bin/pm2 restart fybot');
    
    console.log('✅ Pronto! Todos os vencimentos foram reajustados para a quantidade exata de dias do plano!');
  } catch (error) {
    console.error('❌ Erro durante o processo:', error.message);
  } finally {
    conn.end();
    process.exit(0);
  }
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
