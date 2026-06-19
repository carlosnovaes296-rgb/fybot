const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const currentOpenTrades = state\.trades\.filter\(\(t: any\) => t\.status === 'OPEN'\);/g;
const replacement = `const currentOpenTrades = state.trades.filter((t: any) => t.status === 'OPEN');
        console.log(\`[DEBUG] symbol=\${symbol} score=\${score} dir=\${direction} isDCATrade=\${isDCATrade} openCount=\${openCount}\`);
        console.log(\`[DEBUG] config.minScore=\${config.minScore} state.symbolTrend=\${state.symbolTrend[symbol]} pendingOrders.has=\${state.pendingOrders.has(symbol)}\`);
        if (isAdmin) { console.log(\`[DEBUG-ADMIN] score: \${score}, config.minScore: \${config.minScore}, isTradingTime: \${isTradingTime()}, botRunning: \${state.botRunning}, systemBlocked: \${state.systemBlocked}\`); }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Debug prints adicionados no backend.");
} else {
    console.log("Não encontrou o bloco.");
}
