import { Client } from 'ssh2';

const conn = new Client();
const NEW_APP_ID = '33RPEzjLRuclN8h2uH1fr';

conn.on('ready', () => {
  console.log('✅ SSH Connected. Atualizando DERIV_APP_ID no .env...');

  const steps = [
    // 1. Criar .env se não existir e adicionar/atualizar DERIV_APP_ID
    `touch /root/fybot/.env`,
    `grep -q 'DERIV_APP_ID' /root/fybot/.env && sed -i 's/DERIV_APP_ID=.*/DERIV_APP_ID=${NEW_APP_ID}/' /root/fybot/.env || echo 'DERIV_APP_ID=${NEW_APP_ID}' >> /root/fybot/.env`,
    // 2. Confirmar resultado
    `echo "=== .env atualizado ===" && cat /root/fybot/.env`,
    // 3. Reiniciar PM2
    `pm2 restart 0 && echo "✅ Servidor reiniciado com novo App ID OAuth!"`
  ];

  let stepIdx = 0;
  
  const runNext = () => {
    if (stepIdx >= steps.length) {
      console.log('\n🎉 App ID OAuth configurado com sucesso!');
      conn.end();
      return;
    }
    
    const cmd = steps[stepIdx++];
    conn.exec(cmd, (err, stream) => {
      if (err) { console.error('Erro:', err); conn.end(); return; }
      stream.on('data', d => process.stdout.write(d.toString()));
      stream.stderr.on('data', d => process.stderr.write(d.toString()));
      stream.on('close', runNext);
    });
  };
  
  runNext();

}).on('error', err => {
  console.error('SSH Error:', err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
