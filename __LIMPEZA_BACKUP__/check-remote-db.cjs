const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`node -e "const fs = require('fs'); const db = JSON.parse(fs.readFileSync('/root/fybot/data/db.json', 'utf8')); const admin = db.users.find(u => u.email === 'carlosnovaes296@gmail.com'); const uid = admin ? admin.id : ''; console.log('Admin ID:', uid); console.log('botRunning:', db.userStates?.[uid]?.botRunning); console.log('systemBlocked:', db.userStates?.[uid]?.systemBlocked); console.log('stopOpeningNewOrders:', db.userStates?.[uid]?.stopOpeningNewOrders); console.log('Licenses:', db.licenses);"`, (err, stream) => {
    stream.on('data', d => console.log(d.toString()))
          .on('close', () => conn.end())
          .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
