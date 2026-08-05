const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(\s*data && state\.botRunning && !state\.systemBlocked && !state\.stopOpeningNewOrders && \(isAdmin \|\| isTradingTime\(\)\)\s*\) \{/g;
const replacement = `if (data && state.botRunning && (isAdmin || (!state.systemBlocked && !state.stopOpeningNewOrders && isTradingTime()))) {`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Admin bypass aplicado no backend com sucesso!");
} else {
    console.log("Não encontrou o bloco de if. Verifica o código atual.");
}
