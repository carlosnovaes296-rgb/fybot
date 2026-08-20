const { Client } = require('ssh2');
const conn = new Client();

const script = `
const https = require('https');

const postData = JSON.stringify({
    email: 'carlosnovaes296@gmail.com',
    password: 'a@2026k@A'
});

const req = https.request('https://fybot.life/api/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', console.error);
req.write(postData);
req.end();
`;

const cmd = `cat << 'EOF' > /root/fybot/test_login.js
${script}
EOF
node /root/fybot/test_login.js`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log(out);
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000,
});
