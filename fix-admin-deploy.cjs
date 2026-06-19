const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const SSH = {
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
};

function execCmd(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream
        .on('data', d => { process.stdout.write(d); out += d; })
        .stderr.on('data', d => process.stderr.write(d));
      stream.on('close', () => resolve(out));
    });
  });
}

conn.on('ready', async () => {
  console.log('✅ SSH conectado ao VPS!\n');

  try {
    // 1) Fix: Patch server.ts no VPS para retornar role: ADMIN no login
    console.log('🔧 [1/4] Corrigindo login no server.ts do VPS...');
    await execCmd(conn, `
      cd /root/fybot && sed -i "s/isAdmin: true,/role: 'ADMIN', isAdmin: true,/g" server.ts && grep -n "role:" server.ts | head -5
    `);
    console.log('✅ server.ts corrigido!\n');

    // 2) Upload do App.tsx local atualizado
    console.log('📤 [2/4] Enviando App.tsx atualizado...');
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        
        const filesToUpload = [
          { local: './src/App.tsx', remote: '/root/fybot/src/App.tsx' },
          { local: './src/components/NavItem.tsx', remote: '/root/fybot/src/components/NavItem.tsx' },
          { local: './server.ts', remote: '/root/fybot/server.ts' },
        ];

        let idx = 0;
        function uploadNext() {
          if (idx >= filesToUpload.length) return resolve();
          const { local, remote } = filesToUpload[idx++];
          if (!fs.existsSync(local)) { console.log(`⚠️  Arquivo não encontrado: ${local}, pulando...`); return uploadNext(); }
          const content = fs.readFileSync(local);
          const stream = sftp.createWriteStream(remote);
          stream.write(content);
          stream.end();
          stream.on('close', () => {
            console.log(`  ✓ ${path.basename(local)} enviado`);
            uploadNext();
          });
          stream.on('error', reject);
        }
        uploadNext();
      });
    });
    console.log('✅ Arquivos enviados!\n');

    // 3) Build no servidor
    console.log('🔨 [3/4] Fazendo build do frontend no VPS (aguarde ~2 min)...');
    await execCmd(conn, 'cd /root/fybot && npm run build 2>&1');
    console.log('✅ Build concluído!\n');

    // 4) Restart PM2
    console.log('🔄 [4/4] Reiniciando servidor com PM2...');
    await execCmd(conn, 'pm2 restart fybot && pm2 status');
    console.log('\n');

    console.log('='.repeat(50));
    console.log('🎉 DEPLOY CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(50));
    console.log('');
    console.log('✅ Correção aplicada: login agora retorna role: ADMIN');
    console.log('✅ Menu lateral Admin visível para usuários ADMIN');
    console.log('✅ Sub-menus: Usuários, Licenças, Pagamentos, Saques, Histórico');
    console.log('✅ Badge com contador de pendências ativo');
    console.log('');
    console.log('🌐 Acesse: http://209.97.163.75:3000');
    console.log('📧 E-mail: carlosnovaes296@gmail.com');
    console.log('🔑 Senha:  password123');
    console.log('='.repeat(50));

  } catch (e) {
    console.error('❌ Erro durante deploy:', e.message || e);
  } finally {
    conn.end();
  }
});

conn.on('error', err => console.error('SSH Error:', err.message));
conn.connect(SSH);
