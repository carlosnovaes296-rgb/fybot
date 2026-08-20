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
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', body);
    });
});

req.on('error', e => console.log('Error:', e));
req.write(postData);
req.end();
`;

const cmd = `cat << 'EOF' > /root/fybot/test_login2.js
${script}
EOF
node /root/fybot/test_login2.js > /root/fybot/test_login2_out.txt 2>&1
cat /root/fybot/test_login2_out.txt`;

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
