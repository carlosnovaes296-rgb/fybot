const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const scriptRemoto = `
    const fs = require('fs');
    const dbPath = '/root/fybot/backend/db/db.json';
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    const userBBB = db.users.find(u => u.name === 'bbb' || u.email.includes('bbb'));
    if (!userBBB) {
      console.log('User BBB not found');
    } else {
      console.log('BBB referredBy: ', userBBB.referredBy);
      
      if (userBBB.referredBy) {
         const sponsor = db.users.find(u => u.id === userBBB.referredBy || u.referralCode === userBBB.referredBy);
         if (sponsor) {
             console.log('Sponsor is:', sponsor.name);
         } else {
             console.log('Sponsor ID found, but no user has this ID or referral code!');
         }
      } else {
         console.log('BBB HAS NO SPONSOR (referredBy is empty)! That is why no commission is paid!');
      }
    }
    console.log('Earnings size:', db.referralEarnings ? db.referralEarnings.length : 0);
  `;

  conn.exec(`node -e "${scriptRemoto.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString().trim());
    });
  });
}).on('error', (err) => console.error(err))
.connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
