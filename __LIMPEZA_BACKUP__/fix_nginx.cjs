const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conectado ao servidor VPS.');
  
  const cmd = `
cat << 'EOF' > /tmp/fix_nginx.js
const fs = require('fs');
const files = fs.readdirSync('/etc/nginx/sites-available/');
for (const file of files) {
  const filePath = '/etc/nginx/sites-available/' + file;
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('proxy_pass http://localhost:3000')) {
    if (!content.includes('location /deriv-ws/')) {
      // Encontra a posição do "location / {"
      const locIndex = content.indexOf('location / {');
      if (locIndex !== -1) {
        const proxyBlock = \`
    location /deriv-ws/ {
        proxy_pass https://ws.derivws.com/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host ws.derivws.com;
        proxy_set_header Origin "https://app.deriv.com";
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
    }
\`;
        content = content.slice(0, locIndex) + proxyBlock + content.slice(locIndex);
        fs.writeFileSync(filePath, content);
        console.log('Nginx config patched successfully in ' + file);
      } else {
        console.log('Could not find "location / {" in ' + file);
      }
    } else {
      console.log('Proxy block already exists in ' + file);
    }
  }
}
EOF
node /tmp/fix_nginx.js
nginx -t
systemctl reload nginx
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('✅ Nginx corrigido e reiniciado.');
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
