const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('Forçando login para qualquer usuário...');
  
  // Substitui a verificação de login para SEMPRE aprovar
  const sedCmd = `sed -i "s/if (!user) {/if (!user) { user = { id: 1, name: 'Admin', email: 'carlosnovaes296@gmail.com', license: '131feb73-0bea-457d-bd15-e8fd9c6ae46a', isAdmin: true, config: { maxDrawdown: 10, maxDailyLoss: 5, lotSize: 0.01, riskRewardRatio: 1.5, useSMC: true, useNewsFilter: true, stopLossMode: 'atr', trailingStop: true, takeProfitMode: 'fixed' }, state: { isRunning: true } }; } if (false) {/g" /root/fybot/server.ts && pm2 restart fybot`;

  conn.exec(sedCmd, (err, stream) => {
    if (err) throw err;
    stream
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()))
      .on('close', () => {
        console.log('\n=============================================');
        console.log('LOGIN FORÇADO APLICADO!');
        console.log('=============================================');
        conn.end();
      });
  });
}).connect({ host: '209.97.163.75', port: 22, username: 'root', password: '1BJPkXYBRk2026@26H', readyTimeout: 20000 });
