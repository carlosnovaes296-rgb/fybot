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
    console.log('📤 Enviando o script de limpeza para o VPS...');
    await uploadFile('./limpar_usuarios.cjs', '/root/fybot/limpar_usuarios.cjs');
    
    console.log('🧹 Executando a limpeza de usuários indesejados no banco de dados do VPS...');
    const result = await runCmd('cd /root/fybot && node limpar_usuarios.cjs');
    console.log(result);
    
    console.log('🔄 Reiniciando o servidor (PM2) para deslogar todos e atualizar a memória...');
    await runCmd('pm2 restart fybot');
    
    console.log('✅ Pronto! O banco de dados foi limpo e o servidor reiniciado. Todos os fantasmas sumiram!');
  } catch (error) {
    console.error('❌ Erro durante o processo:', error.message);
  } finally {
    conn.end();
    process.exit(0);
  }
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
