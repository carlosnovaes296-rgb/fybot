const fs = require('fs');
const { Client } = require('ssh2');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');

console.log('1. Compilando o Frontend (npm run build)...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
  console.error('Erro no build!', e);
  process.exit(1);
}

console.log('2. Compactando a pasta dist...');
const zip = new AdmZip();
zip.addLocalFolder('./dist', '');
zip.writeZip('./dist.zip');
console.log('dist.zip criado com sucesso!');

console.log('3. Conectando na VPS...');
const conn = new Client();

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    console.log('4. Enviando dist.zip para a VPS (aguarde)...');
    sftp.fastPut('./dist.zip', '/root/fybot/dist.zip', (err) => {
      if (err) throw err;
      console.log('Upload concluído!');
      
      console.log('5. Extraindo na VPS e reiniciando o PM2...');
      // Instala o unzip se não tiver, extrai apagando o anterior, apaga o zip e reinicia o pm2
      const cmd = `cd /root/fybot && apt-get install -y unzip && rm -rf dist && unzip -o dist.zip -d dist && rm dist.zip && pm2 restart fybot`;
      
      conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('close', () => {
          console.log('Deploy do Frontend finalizado com sucesso:\\n' + out);
          fs.unlinkSync('./dist.zip'); // Remove o zip local
          conn.end();
        }).on('data', (data) => {
          out += data.toString();
        }).stderr.on('data', (data) => {
          out += data.toString();
        });
      });
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000,
});
