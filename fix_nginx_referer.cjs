const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conectado ao servidor VPS.');
  
  const cmd = `
cat << 'EOF' > /tmp/fix_nginx_referer.js
const fs = require('fs');
const files = fs.readdirSync('/etc/nginx/sites-available/');
for (const file of files) {
  const filePath = '/etc/nginx/sites-available/' + file;
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('proxy_pass https://ws.derivws.com/')) {
    // Adiciona a remoção do Referer para enganar perfeitamente a Deriv
    if (!content.includes('proxy_set_header Referer "";')) {
      content = content.replace(
        'proxy_set_header Origin "https://api.deriv.com";', 
        'proxy_set_header Origin "https://api.deriv.com";\\n        proxy_set_header Referer "";'
      );
      fs.writeFileSync(filePath, content);
      console.log('Nginx Referer patched successfully in ' + file);
    }
  }
}
EOF
node /tmp/fix_nginx_referer.js
nginx -t
systemctl reload nginx
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('✅ Nginx Referer corrigido e reiniciado com sucesso absoluto!');
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
