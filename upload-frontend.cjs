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
    
    // Old uploadFiles function removed, replaced by uploadMapped below
    // Ler todos os arquivos da pasta dist local
    if (!fs.existsSync(distDir)) {
      console.error('❌ A pasta dist não existe! Rode npm run build primeiro.');
      conn.end();
      return;
    }
    
    // Obter arquivos do dist e do backend
    const allDistFiles = getAllFiles(distDir);
    const backendDir = path.join(__dirname, 'backend');
    let allBackendFiles = [];
    if (fs.existsSync(backendDir)) {
       allBackendFiles = getAllFiles(backendDir);
    }
    
    // Mapear os caminhos para o formato esperado pelo upload
    const uploadList = [
       ...allDistFiles.map(f => ({ local: f, remote: `${remoteDistDir}/${path.relative(distDir, f).replace(/\\/g, '/')}` })),
       ...allBackendFiles.map(f => ({ local: f, remote: `/root/fybot/backend/${path.relative(backendDir, f).replace(/\\/g, '/')}` }))
    ];

    console.log(`Encontrados ${allDistFiles.length} arquivos no frontend e ${allBackendFiles.length} no backend para enviar...`);
    
    // Função atualizada para usar a lista mapeada
    const uploadMapped = (list, index = 0) => {
      if (index >= list.length) {
        console.log('\n🎉 Todos os arquivos do frontend e backend foram enviados!');
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
      
      const { local, remote } = list[index];
      const remoteDir = path.dirname(remote);
      sftp.mkdir(remoteDir, true, (err) => {
        process.stdout.write(`\rEnviando: ${remote} ... `);
        sftp.fastPut(local, remote, (err) => {
          if (err) console.error(`\nErro ao enviar ${remote}:`, err);
          uploadMapped(list, index + 1);
        });
      });
    };

    uploadMapped(uploadList);
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
