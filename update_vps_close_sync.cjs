const { Client } = require('ssh2');
const conn = new Client();

const cmd = `
# Reduz o intervalo de polling do portfolio para 5 segundos
sed -i 's/}, 15000);/}, 5000);/g' /root/fybot/backend/services/DerivConnectionManager.ts
sed -i 's/}, 20000);/}, 5000);/g' /root/fybot/backend/services/DerivConnectionManager.ts

# Adiciona o fechamento instantâneo no retorno de sucesso da mensagem de VENDA (sell)
sed -i '/this.addUserLog(userId, \`✅ \\[VENDA CONFIRMADA\\] Contrato \${data.sell.contract_id ?? '\\'''\\''} enviado para fechamento com sucesso.\`);/c\\
            this.addUserLog(userId, \`✅ [VENDA CONFIRMADA] Contrato \${data.sell.contract_id ?? '\\'''\\''} fechado com sucesso na corretora.\`);\\
            const contractId = String(data.sell.contract_id);\\
            const state = this.getUserState(userId);\\
            const trade = state.trades.find((t: any) => String(t.id) === contractId);\\
            if (trade && trade.status !== '\\''CLOSED\\'') {\\
                trade.status = '\\''CLOSED\\'';\\
                this.openContractIds.get(userId)?.delete(contractId);\\
                this.getClosingSet(userId).delete(contractId);\\
            }' /root/fybot/backend/services/DerivConnectionManager.ts

cd /root/fybot && npm run build && pm2 restart fybot
`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log(out);
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    }).stderr.on('data', (data) => {
      out += data.toString();
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000,
});
