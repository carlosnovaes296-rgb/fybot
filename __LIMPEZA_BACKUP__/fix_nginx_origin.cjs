const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conectado ao servidor VPS.');
  
  const cmd = `
cat << 'EOF' > /tmp/fix_nginx_origin.js
const fs = require('fs');
const files = fs.readdirSync('/etc/nginx/sites-available/');
for (const file of files) {
  const filePath = '/etc/nginx/sites-available/' + file;
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('proxy_pass https://ws.derivws.com/')) {
    // Troca a origem de app.deriv.com para api.deriv.com (para combinar com o app_id 36544)
    content = content.replace('proxy_set_header Origin "https://app.deriv.com";', 'proxy_set_header Origin "https://api.deriv.com";');
    fs.writeFileSync(filePath, content);
    console.log('Nginx Origin patched successfully in ' + file);
  }
}
EOF
node /tmp/fix_nginx_origin.js
nginx -t
systemctl reload nginx
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('✅ Nginx Origin corrigida e reiniciada.');
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
