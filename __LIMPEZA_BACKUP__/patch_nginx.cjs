const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conectado ao servidor VPS.');
  
  const cmd = `
cat << 'EOF' > /tmp/nginx_patch.sh
#!/bin/bash
FILE="/etc/nginx/sites-available/fybot"

if grep -q "location /deriv-ws/" "$FILE"; then
  echo "Proxy /deriv-ws/ já existe."
else
  sed -i '/location \/api/i \
    location /deriv-ws/ {\n\
        proxy_pass https://ws.derivws.com/;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_set_header Host ws.derivws.com;\n\
        proxy_set_header Origin "https://app.deriv.com";\n\
        proxy_ssl_server_name on;\n\
    }\n' "$FILE"
  echo "Proxy /deriv-ws/ adicionado com sucesso."
fi

systemctl reload nginx
EOF
chmod +x /tmp/nginx_patch.sh
/tmp/nginx_patch.sh
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('✅ Nginx configurado e reiniciado.');
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
