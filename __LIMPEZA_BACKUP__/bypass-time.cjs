const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(data && state\.botRunning && !state\.systemBlocked && !state\.stopOpeningNewOrders && isTradingTime\(\)\) \{/g;

const replacement = `const userObj = users.find(u => u.id === uId);
    const isAdmin = userObj && userObj.isAdmin === true;
    if (data && state.botRunning && !state.systemBlocked && !state.stopOpeningNewOrders && (isAdmin || isTradingTime())) {`;

code = code.replace(regex, replacement);

fs.writeFileSync('server.ts', code);
console.log('Admin bypass for trading time applied');
