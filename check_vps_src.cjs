const { Client } = require('ssh2');
const conn = new Client();

const script = `
const fs = require('fs');
let code = fs.readFileSync('/root/fybot/src/App.tsx', 'utf8');
const search = \`          <NavItem
            icon={<Download size={20} color="#FFD700" />}
            label={language === 'en' ? 'Download FYBOT TREND' : 'Baixar FYBOT TREND'}
            onClick={() => {
              const link = document.createElement('a');
              link.href = '/Fybot_trend.mq5';
              link.download = 'Fybot_trend.mq5';
              link.click();
              setIsMobileMenuOpen(false);
            }}
          />\`;

const replace = \`          {currentUser?.role === 'ADMIN' && (
            <NavItem
              icon={<Download size={20} color="#FFD700" />}
              label={language === 'en' ? 'Download FYBOT TREND' : 'Baixar FYBOT TREND'}
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/Fybot_trend.mq5';
                link.download = 'Fybot_trend.mq5';
                link.click();
                setIsMobileMenuOpen(false);
              }}
            />
          )}\`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('/root/fybot/src/App.tsx', code, 'utf8');
  console.log('REPLACED');
} else {
  console.log('NOT FOUND');
}
`;

const cmd = `cat << 'EOF' > /root/fybot/update_app.cjs
${script}
EOF
node /root/fybot/update_app.cjs && cd /root/fybot && npm run build
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
