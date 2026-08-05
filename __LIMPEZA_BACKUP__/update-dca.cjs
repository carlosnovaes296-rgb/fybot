const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const newestOrder = symbolOpenTrades\[symbolOpenTrades\.length - 1\];[\s\S]*?if \(stepDrawdownPct >= threshold\) \{/;

const replacement = `const firstOrder = symbolOpenTrades[0];
          const firstPrice = firstOrder.openPrice;
          let totalDrawdownPct = 0;
          
          if (firstOrder.type === 'BUY') totalDrawdownPct = (firstPrice - price) / firstPrice;
          else if (firstOrder.type === 'SELL') totalDrawdownPct = (price - firstPrice) / firstPrice;

          let threshold = 0.0002; // Ordem 2: 0.02%
          if (openCount === 2) threshold = 0.0004; // Ordem 3: 0.04%
          else if (openCount === 3) threshold = 0.0006; // Ordem 4: 0.06%
          else if (openCount === 4) threshold = 0.0008; // Ordem 5: 0.08%
          else if (openCount === 5) threshold = 0.0010; // Ordem 6: 0.10%

          if (totalDrawdownPct >= threshold) {`;

code = code.replace(regex, replacement);

fs.writeFileSync('server.ts', code);
console.log('DCA logic updated to use firstOrder totalDrawdownPct');
