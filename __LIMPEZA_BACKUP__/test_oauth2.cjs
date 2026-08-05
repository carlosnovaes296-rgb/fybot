const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conectado ao servidor VPS.');
  
  const cmd = `
cat << 'EOF' > /tmp/test_oauth2.cjs
const https = require('https');

const options = {
  hostname: 'oauth.deriv.com',
  port: 443,
  path: '/oauth2/authorize?client_id=33PVKdgTEIn9JlNjX0izq&response_type=token&redirect_uri=https://fybot.life/dashboard',
  method: 'GET'
};

const req = https.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers, null, 2));
  process.exit(0);
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
EOF
node /tmp/test_oauth2.cjs
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log('--- OUTPUT ---');
      console.log(out);
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    }).stderr.on('data', (data) => {
      out += data.toString();
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 60000
});
