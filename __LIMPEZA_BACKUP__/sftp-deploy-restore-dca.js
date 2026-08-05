import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected.');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    let serverContent = fs.readFileSync('./server.ts', 'utf8');
    
    const blockToReplace = `        console.log("DEBUG: openCount=", openCount, "isDCATrade=", isDCATrade, "score=", score, "direction=", direction, "symbolTrend=", state.symbolTrend[symbol]);
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
          if ((direction === 'BUY' && config.allowBuy === false) || (direction === 'SELL' && config.allowSell === false)) { console.log("DEBUG: Retornou no allowBuy/allowSell"); return; }`;

    const properBlock = `        if (state.stopOpeningNewOrders && openCount === 0) return;

        if (openCount > 0 && openCount < 6) {
          const firstOrder = symbolOpenTrades[0];
          const firstPrice = firstOrder.openPrice;
          let totalDrawdownPct = 0;
          
          if (firstOrder.type === 'BUY') totalDrawdownPct = (firstPrice - price) / firstPrice;
          else if (firstOrder.type === 'SELL') totalDrawdownPct = (price - firstPrice) / firstPrice;

          let threshold = 0.0002; // Ordem 2: 0.02%
          if (openCount === 2) threshold = 0.0004; // Ordem 3: 0.04%
          else if (openCount === 3) threshold = 0.0006; // Ordem 4: 0.06%
          else if (openCount === 4) threshold = 0.0008; // Ordem 5: 0.08%
          else if (openCount === 5) threshold = 0.0010; // Ordem 6: 0.10%

          if (totalDrawdownPct >= threshold) {
            isDCATrade = true;
            direction = state.symbolTrend[symbol]; // Força mesma direção
            addUserLog(uId, \`⚠️ [DCA] Recuo total de -\${(threshold * 100).toFixed(2)}%. Abrindo \${openCount + 1}ª ordem para \${symbol}.\`);
          }
        }

        if (openCount > 0 && !isDCATrade) return;

        // 2. TRAVA DE TENDÊNCIA
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
              return;
            }
          }

          if (!direction || direction !== state.symbolTrend[symbol]) return;
          if (score < config.minScore) return;
        }

        // 3. LIMITES
        if (currentOpenTrades.length >= 20 || openCount >= 6 || state.pendingOrders.has(symbol)) return;

        if (direction) {
          if ((direction === 'BUY' && config.allowBuy === false) || (direction === 'SELL' && config.allowSell === false)) return;`;

    serverContent = serverContent.replace(blockToReplace, properBlock);
    
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
