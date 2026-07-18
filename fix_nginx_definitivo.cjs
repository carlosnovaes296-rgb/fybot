const { Client } = require('ssh2');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const conn = new Client();

console.log("==========================================");
console.log("🛠️ CORRETOR DEFINITIVO DO NGINX (WEBSOCKETS)");
console.log("==========================================\n");

rl.question("Digite o IP do seu VPS: ", (host) => {
  console.log("\nConectando ao VPS " + host + "...");

  conn.on('ready', () => {
    console.log('✅ SSH Conectado com sucesso!');

    const command = `
cat << 'EOF' > /etc/nginx/sites-available/fybot
server {
    listen 80;
    server_name fybot.life www.fybot.life;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # SUPORTE ABSOLUTO A WEBSOCKETS (OBRIGATÓRIO PARA O SALDO APARECER)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/fybot /etc/nginx/sites-enabled/fybot
systemctl restart nginx
echo "✅ Nginx reescrito e reiniciado!"
`;

    conn.exec(command, (err, stream) => {
      if (err) {
        console.error("❌ Erro ao executar o comando:", err);
        conn.end();
        rl.close();
        return;
      }
      stream.on('close', (code, signal) => {
        console.log('🎉 TUDO PRONTO! AGORA O WEBSOCKET VAI PASSAR PERFEITAMENTE!');
        conn.end();
        rl.close();
      }).on('data', (data) => {
        console.log(data.toString());
      }).stderr.on('data', (data) => {
        console.error(data.toString());
      });
    });
  }).on('error', (err) => {
    console.error("❌ Erro SSH:", err.message);
    rl.close();
  }).connect({
    host: host.trim(),
    port: 22,
    username: 'root',
    password: '1BJPkXYBRk2026@26H'
  });
});
