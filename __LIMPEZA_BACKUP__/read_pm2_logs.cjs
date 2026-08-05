const { Client } = require('ssh2');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const conn = new Client();

rl.question("Digite o IP do seu VPS: ", (host) => {
  conn.on('ready', () => {
    // 1) Vamos ler os ultimos 50 logs do pm2 para ver se o PROXY esta recebendo conexao
    const command = `pm2 logs fybot --lines 100 --nostream`;
    conn.exec(command, (err, stream) => {
      if (err) {
        console.error("Erro:", err);
        return;
      }
      let output = '';
      stream.on('data', (data) => {
        output += data.toString();
      });
      stream.on('close', () => {
        console.log("=== PM2 LOGS ===");
        console.log(output);
        conn.end();
        rl.close();
      });
    });
  }).connect({
    host: host.trim(),
    port: 22,
    username: 'root',
    password: '1BJPkXYBRk2026@26H'
  });
});
