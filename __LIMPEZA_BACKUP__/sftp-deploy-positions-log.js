import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    let serverContent = fs.readFileSync('./server.ts', 'utf8');
    
    const blockToReplace = `    const { userId, licenseKey, botVersion, balance, equity, open_positions, open_tickets, data } = req.body;`;

    const newBlock = `    const { userId, licenseKey, botVersion, balance, equity, open_positions, open_tickets, data } = req.body;
    if (open_positions && open_positions.length > 0) {
        console.log("MT5 POSITIONS: ", JSON.stringify(open_positions));
    }`;

    serverContent = serverContent.replace(blockToReplace, newBlock);
    
    fs.writeFileSync('./server.ts', serverContent);
    
    const serverStream = sftp.createWriteStream('/root/fybot/server.ts');
    serverStream.write(serverContent);
    serverStream.end();
    serverStream.on('close', () => {
      console.log('📤 server.ts uploaded!');
      conn.exec('cd /root/fybot && pm2 restart fybot', (err2, stream2) => {
        if (err2) throw err2;
        stream2.on('close', () => {
          console.log('🎉 Server restarted!');
          conn.end();
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('SSH Error: ' + err);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 20000
});
