const { Client } = require('ssh2');
const conn = new Client();

const runCmd = (cmd) => {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('close', (code, signal) => {
        resolve(out);
      }).on('data', (data) => {
        out += data;
      }).stderr.on('data', (data) => {
        out += data;
      });
    });
  });
};

conn.on('ready', async () => {
  try {
    const hasChart = await runCmd(`grep -q "Sinal de Inteligência" /root/fybot/src/App.tsx && echo "YES" || echo "NO"`);
    console.log("TEM GRAFICO NO VPS?", hasChart.trim());

    const hasMT5 = await runCmd(`grep -q "Login MT5 configurado:" /root/fybot/src/App.tsx && echo "YES" || echo "NO"`);
    console.log("TEM MT5 NO VPS?", hasMT5.trim());
    
    const buildLog = await runCmd(`cd /root/fybot && npm run build 2>&1 | tail -n 20`);
    console.log("ULTIMO LOG DE BUILD:\\n", buildLog);

  } catch (e) {
    console.error('❌ ERRO:', e);
  }
  conn.end();
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
