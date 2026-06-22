const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  // Inject an order directly into the database or trigger via API
  const script = `
    const fs = require('fs');
    const path = '/root/fybot/data/db.json';
    const db = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    // Find Carlos
    let targetState;
    for(let key in db.userStates) {
      targetState = db.userStates[key];
      break;
    }
    
    if(targetState) {
      if(!targetState.pendingCommands) targetState.pendingCommands = [];
      targetState.pendingCommands.push({
        action: 'OPEN',
        symbol: 'XAUUSDm',
        type: 'BUY',
        lot: 0.01,
        volume: 0.01,
        lots: 0.01,
        ticket_ref: Math.floor(Math.random() * 10000000).toString()
      });
      fs.writeFileSync(path, JSON.stringify(db, null, 2));
      console.log('Order injected to db.json');
    }
  `;
  
  conn.exec(`node -e "${script.replace(/"/g, '\\"')}" && pm2 reload fybot`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('Done injecting');
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    });
  });
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
