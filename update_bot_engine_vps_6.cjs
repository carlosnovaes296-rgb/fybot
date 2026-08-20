const { Client } = require('ssh2');
const conn = new Client();
const fs = require('fs');

const localFileContent = fs.readFileSync('c:\\Users\\sobit\\OneDrive\\Área de Trabalho\\Fybot pro\\backend\\services\\DerivBotEngine.ts', 'utf8');

const cmd = `
const fs = require('fs');
fs.writeFileSync('/root/fybot/backend/services/DerivBotEngine.ts', Buffer.from('${Buffer.from(localFileContent).toString('base64')}', 'base64').toString('utf8'));
`;

conn.on('ready', () => {
  conn.exec(`node -e "${cmd.replace(/"/g, '\\"')}" && cd /root/fybot && npm run build && pm2 restart fybot`, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log(out);
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    }).stderr.on('data', (data) => {
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
