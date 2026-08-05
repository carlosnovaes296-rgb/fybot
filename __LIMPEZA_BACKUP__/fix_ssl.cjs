const { Client } = require('ssh2');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const conn = new Client();

rl.question("Digite o IP do seu VPS: ", (host) => {
  conn.on('ready', () => {
    // 1) Vamos rodar o certbot para re-injetar o SSL no Nginx automaticamente!
    const command = `
      certbot --nginx -d fybot.life -d www.fybot.life --non-interactive --agree-tos -m jfcn2020@gmail.com --redirect
      systemctl restart nginx
      echo "SSL Restaurado e Nginx reiniciado com sucesso!"
    `;
    conn.exec(command, (err, stream) => {
      if (err) {
        console.error("Erro:", err);
        return;
      }
      stream.on('close', () => {
        conn.end();
        rl.close();
      }).on('data', (data) => {
        console.log(data.toString());
      });
    });
  }).connect({
    host: host.trim(),
    port: 22,
    username: 'root',
    password: '1BJPkXYBRk2026@26H'
  });
});
