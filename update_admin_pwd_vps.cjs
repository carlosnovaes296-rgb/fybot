const { Client } = require('ssh2');
const conn = new Client();

const script = `
const fs = require('fs');
const dbPath = '/root/fybot/data/db.json';
try {
    let rawdata = fs.readFileSync(dbPath, 'utf8');
    let db = JSON.parse(rawdata);
    let updated = false;
    
    if (db.users && Array.isArray(db.users)) {
        db.users.forEach(user => {
            if (user.role === 'ADMIN' || user.email.includes('jfcn2020') || user.email.includes('carlosnovaes296')) {
                user.password = 'a@2026k@A';
                updated = true;
            }
        });
    }
    
    if (updated) {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
        console.log('Admin password updated successfully in db.json!');
    } else {
        console.log('No admin users found to update.');
    }
} catch (e) {
    console.error('Error updating db.json:', e);
}
`;

const cmd = `cat << 'EOF' > /root/fybot/update_admin_pwd.cjs
${script}
EOF
node /root/fybot/update_admin_pwd.cjs && pm2 restart fybot`;

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
