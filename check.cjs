const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`mysql -u root -pFybot2026! -D fybot_db -e "SELECT id, name, referredBy FROM users;"`, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      // Build a map of id -> user
      const lines = out.split('\\n');
      const users = {};
      lines.forEach(line => {
        const [id, name, referredBy] = line.split('\\t');
        if (id && id !== 'id') {
          users[id] = { name, referredBy: referredBy && referredBy.trim() ? referredBy.trim() : null };
        }
      });
      
      const paulo = Object.values(users).find(u => u.name && u.name.toUpperCase().includes('PAULO MIGUEL'));
      if (!paulo) { console.log('Paulo not found'); return conn.end(); }
      
      const pauloId = Object.keys(users).find(id => users[id] === paulo);
      
      console.log('--- Upline de PAULO MIGUEL ---');
      let currentId = paulo.referredBy;
      let level = 1;
      while (currentId && level <= 10) {
        // try to find by ID or referralCode (but here we only have ID from DB, let's assume referredBy stores ID or code)
        // usually referredBy stores the sponsor's ID
        let sponsor = users[currentId];
        // if not found by ID, maybe it's a referralCode? we didn't fetch referralCode. Let's fetch everything instead.
        if (!sponsor) {
           console.log(`Level ${level}: ${currentId} (NOT FOUND IN MAP)`);
           break;
        }
        console.log(`Level ${level}: ${sponsor.name} (${currentId})`);
        currentId = sponsor.referredBy;
        level++;
      }
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    }).stderr.on('data', (data) => {
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H'
});
