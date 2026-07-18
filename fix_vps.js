import { Client } from 'ssh2';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const conn = new Client();

console.log("==========================================");
console.log("🛠️  CORRETOR AUTOMÁTICO DE NGINX (FYBOT) 🛠️");
console.log("==========================================\n");

rl.question("Digite o IP do seu VPS: ", (host) => {
  console.log("\nConectando ao VPS " + host + "...");

  conn.on('ready', () => {
    console.log('✅ SSH Conectado com sucesso!');

    const command = `
      # Procura em painéis comuns e Nginx padrão
      CONFIG_DIRS="/etc/nginx/sites-enabled/* /etc/nginx/conf.d/* /www/server/panel/vhost/nginx/*.conf /etc/nginx/nginx.conf"
      
      for file in $CONFIG_DIRS; do
        if [ -f "$file" ]; then
          # Procura qualquer location que tenha proxy_pass
          if grep -q "proxy_pass" "$file"; then
            echo "🔥 Arquivo com Proxy encontrado: $file"
            if ! grep -q "proxy_set_header Upgrade" "$file"; then
              echo "⚙️  Injetando suporte a WebSocket MÁXIMO em $file..."
              sed -i '/proxy_pass /a \\    proxy_http_version 1.1;\\n    proxy_set_header Upgrade $http_upgrade;\\n    proxy_set_header Connection "upgrade";' "$file"
            else
              echo "✅ Suporte a WebSocket já existe neste arquivo."
            fi
          fi
        fi
      done
      
      echo "Reiniciando o Nginx..."
      systemctl restart nginx
      echo "Sucesso!"
    `;

    conn.exec(command, (err, stream) => {
      if (err) {
        console.error("❌ Erro ao executar o comando:", err);
        conn.end();
        rl.close();
        return;
      }
      stream.on('close', (code, signal) => {
        console.log('✅ Nginx configurado e reiniciado perfeitamente!');
        conn.end();
        rl.close();
      }).on('data', (data) => {
        console.log('STDOUT: ' + data);
      }).stderr.on('data', (data) => {
        console.error('STDERR: ' + data);
      });
    });
  }).on('error', (err) => {
    console.error("❌ Erro de Conexão SSH:", err.message);
    rl.close();
  }).connect({
    host: host.trim(),
    port: 22,
    username: 'root',
    password: '1BJPkXYBRk2026@26H'
  });
});
