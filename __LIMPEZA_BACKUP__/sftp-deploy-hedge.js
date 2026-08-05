import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    let serverContent = fs.readFileSync('./server.ts', 'utf8');
    
    const blockToReplace = `          if (totalDrawdownPct >= threshold) {
            isDCATrade = true;
            direction = state.symbolTrend[symbol]; // Força mesma direção
            addUserLog(uId, \`⚠️ [DCA] Recuo total de -\${(threshold * 100).toFixed(2)}%. Abrindo \${openCount + 1}ª ordem para \${symbol}.\`);
          }`;

    const newBlock = `          if (totalDrawdownPct >= threshold) {
            isDCATrade = true;
            const firstDir = firstOrder.type;
            if (openCount % 2 === 1) {
                direction = firstDir === 'BUY' ? 'SELL' : 'BUY';
            } else {
                direction = firstDir;
            }
            addUserLog(uId, \`⚠️ [HEDGE] Recuo total de -\${(threshold * 100).toFixed(2)}%. Abrindo \${openCount + 1}ª ordem (\${direction}) para \${symbol}.\`);
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
