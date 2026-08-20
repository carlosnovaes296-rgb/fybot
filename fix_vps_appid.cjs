const { Client } = require('ssh2');
const conn = new Client();

const script = `
const fs = require('fs');
const glob = require('glob'); // Not available? I will use simple recursive search
const path = require('path');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('33TVM6cBQ9GfSjbwQHHdE')) {
      content = content.split('33TVM6cBQ9GfSjbwQHHdE').join('1089');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Replaced in ' + filePath);
    }
  } catch(e) {}
}

const files = [
  '/root/fybot/server.ts',
  '/root/fybot/backend/deriv/config.ts',
  '/root/fybot/backend/services/DerivBotEngine.ts',
  '/root/fybot/backend/services/DerivBotEngineEMA.ts',
  '/root/fybot/backend/services/DerivConnectionManager.ts'
];

files.forEach(replaceInFile);
`;

const cmd = `cat << 'EOF' > /root/fybot/fix_appid.cjs
${script}
EOF
node /root/fybot/fix_appid.cjs && pm2 restart fybot
`;

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
