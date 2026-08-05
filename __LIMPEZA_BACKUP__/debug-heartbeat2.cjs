const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(data && state\.botRunning && \(isAdmin \|\| \(\!state\.systemBlocked && \!state\.stopOpeningNewOrders && isTradingTime\(\)\)\)\) \{/g;
const replacement = `console.log(\`[HEARTBEAT-DEBUG] data=\${!!data} botRunning=\${state.botRunning} isAdmin=\${isAdmin}\`);
    if (data && state.botRunning && (isAdmin || (!state.systemBlocked && !state.stopOpeningNewOrders && isTradingTime()))) {`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Debug 2 inserido com sucesso.");
} else {
    console.log("Não encontrou o bloco de if. Verifica o código atual.");
}
