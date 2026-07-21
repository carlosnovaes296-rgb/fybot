const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const distDir = path.join(__dirname, 'dist');
const remoteDistDir = '/root/fybot/dist';

const getAllFiles = (dirPath, arrayOfFiles) => {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach((file) => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
};

conn.on('ready', () => {
  console.log('✅ SSH Connected. Uploading frontend (dist)...');
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP error:', err); conn.end(); return; }
    
    // Função para fazer upload de cada arquivo
    const uploadFiles = (files, index = 0) => {
      if (index >= files.length) {
        console.log('\n🎉 Todos os arquivos do frontend foram enviados!');
        console.log('Enviando server.ts...');
        sftp.fastPut(path.join(__dirname, 'server.ts'), '/root/fybot/server.ts', (err) => {
          if (err) console.error('Erro ao enviar server.ts:', err);
          console.log('Restarting server...');
          conn.exec('/usr/lib/node_modules/pm2/bin/pm2 restart fybot', (err, stream) => {
            if (err) { console.error(err); conn.end(); return; }
            let out = '';
            stream.on('data', d => { out += d; process.stdout.write(d); })
                  .stderr.on('data', d => process.stderr.write(d));
            stream.on('close', () => {
              console.log('\n🎉 Frontend e Backend atualizados com sucesso no servidor!');
              conn.end();
            });
          });
        });
        return;
      }
      
      const localFile = files[index];
      const relativePath = path.relative(distDir, localFile).replace(/\\/g, '/');
      const remoteFile = `${remoteDistDir}/${relativePath}`;
      
      // Criar a pasta se não existir e fazer upload
      const remoteDir = path.dirname(remoteFile);
      sftp.mkdir(remoteDir, true, (err) => {
        // ignora erro se a pasta já existe
        process.stdout.write(`\rEnviando: ${relativePath} ... `);
        sftp.fastPut(localFile, remoteFile, (err) => {
          if (err) console.error(`\nErro ao enviar ${relativePath}:`, err);
          uploadFiles(files, index + 1);
        });
      });
    };
    
    // Ler todos os arquivos da pasta dist local
    if (!fs.existsSync(distDir)) {
      console.error('❌ A pasta dist não existe! Rode npm run build primeiro.');
      conn.end();
      return;
    }
    
    const allFiles = getAllFiles(distDir);
    console.log(`Encontrados ${allFiles.length} arquivos para enviar...`);
    uploadFiles(allFiles);
  });
}).on('error', (err) => {
  console.error('SSH Error:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
