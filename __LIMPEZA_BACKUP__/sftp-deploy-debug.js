import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    let serverContent = fs.readFileSync('./server.ts', 'utf8');
    
    // Inject debug logs
    const debugCode = `
        console.log("DEBUG: openCount=", openCount, "isDCATrade=", isDCATrade, "score=", score, "direction=", direction, "symbolTrend=", state.symbolTrend[symbol]);
        if (state.stopOpeningNewOrders && openCount === 0) { console.log("DEBUG: Retornou no stopOpeningNewOrders"); return; }
        if (openCount > 0 && !isDCATrade) { console.log("DEBUG: Retornou no openCount > 0 && !isDCATrade"); return; }
        if (!isDCATrade) {
          if (!state.symbolTrend) state.symbolTrend = {};
          if (!state.symbolTrend[symbol] && direction && score >= config.minScore) {
            state.symbolTrend[symbol] = direction; 
            addUserLog(uId, \`🔄 Tendência inicial definida para \${direction} em \${symbol}\`);
          }
          const currentTrend = state.symbolTrend[symbol];
          if (direction && currentTrend && direction !== currentTrend) {
            if (score >= 80) {
              state.symbolTrend[symbol] = direction;
              addUserLog(uId, \`🔄 [REVERSÃO] Tendência virou de \${currentTrend} para \${direction} em \${symbol}!\`);
            } else {
              console.log("DEBUG: Retornou no direction !== currentTrend e score < 80"); return;
            }
          }
          if (!direction || direction !== state.symbolTrend[symbol]) { console.log("DEBUG: Retornou no !direction || direction !== state.symbolTrend"); return; }
          if (score < config.minScore) { console.log("DEBUG: Retornou no score < config.minScore (", score, "<", config.minScore, ")"); return; }
        }
        if (currentOpenTrades.length >= 20 || openCount >= 6 || state.pendingOrders.has(symbol)) { console.log("DEBUG: Retornou no limites (openTrades=", currentOpenTrades.length, "openCount=", openCount, "pendingOrders.has=", state.pendingOrders.has(symbol), ")"); return; }
        if (direction) {
          if ((direction === 'BUY' && config.allowBuy === false) || (direction === 'SELL' && config.allowSell === false)) { console.log("DEBUG: Retornou no allowBuy/allowSell"); return; }
`;
    
    // Replace the block
    serverContent = serverContent.replace(
       /if \(state\.stopOpeningNewOrders && openCount === 0\) return;[\s\S]*?if \(\(direction === 'BUY' && config\.allowBuy === false\) \|\| \(direction === 'SELL' && config\.allowSell === false\)\) return;/g,
       debugCode
    );
    
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
