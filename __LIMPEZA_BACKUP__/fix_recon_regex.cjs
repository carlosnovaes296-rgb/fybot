const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

const regex = /\/\/ Process open positions matching MT5 reality[\s\S]*?(?=if \(data && state\.botRunning)/;

const replacementContent = `// Process open positions matching MT5 reality
    if (open_tickets && open_positions) {
      const mt5OpenTickets = open_tickets.map((t: number) => t.toString());
      // FIRST: Reconcile temp tickets with real MT5 tickets
      state.trades.forEach((t: any) => {
        if (t.status === 'OPEN' && !mt5OpenTickets.includes(t.id.toString())) {
          // Check if there's an unmatched real position for this symbol
          const unmatchedMt5Positions = open_positions.filter((p: any) => 
             p.symbol.includes(t.symbol) && !state.trades.some((existingTrade: any) => existingTrade.id.toString() === p.ticket.toString())
          );
          
          if (unmatchedMt5Positions.length > 0) {
             const realPos = unmatchedMt5Positions[0];
             t.id = realPos.ticket.toString();
          } else {
             // Give it a 15-second grace period before assuming it was closed, because the EA might not have executed it yet
             const age = Date.now() - new Date(t.time).getTime();
             if (age > 15000) {
               t.status = 'CLOSED';
               addUserLog(uId, \`🔄 Ordem \${t.id} (\${t.symbol}) finalizada no MT5. Vaga liberada!\`);
             }
          }
        }
      });

      // THEN: Process normal profit and stop loss for matched open trades
      state.trades.forEach((t: any) => {
        if (t.status === 'OPEN') {
          if (mt5OpenTickets.includes(t.id.toString())) {
            const pos = open_positions.find((p: any) => p.ticket.toString() === t.id.toString());
            const currentProfit = pos ? pos.profit : 0;
            t.maxProfit = Math.max(t.maxProfit || 0, currentProfit);

            // REGRA DE PROTEÇÃO CONTRA PERDA (Stop Loss de 10% da banca)
            const startingDailyBalanceForStop = state.customStartingBalance ? state.customStartingBalance : state.balance;
            const maxLossLimit = -Number((startingDailyBalanceForStop * 0.10).toFixed(2));
            if (currentProfit <= maxLossLimit) {
               t.status = 'CLOSED';
               addUserLog(uId, \`🛑 [STOP LOSS] Ordem \${t.id} (\${t.symbol}) fechada! Limite atingido: $\${currentProfit.toFixed(2)}\`);
               
               if (!state.pendingCommands) state.pendingCommands = [];
               state.pendingCommands.push({ action: 'CLOSE', ticket: t.id.toString() });
            }
          }
        }
      });
    }

    `;

code = code.replace(regex, replacementContent);
fs.writeFileSync('server.ts', code);
console.log('Reconciliation logic successfully replaced');
