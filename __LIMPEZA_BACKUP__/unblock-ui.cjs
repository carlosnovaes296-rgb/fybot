const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const regex = /systemBlocked: state\.systemBlocked,/g;

const replacement = `systemBlocked: (users.find(u => u.id === userId)?.isAdmin) ? false : state.systemBlocked,`;

code = code.replace(regex, replacement);

fs.writeFileSync('server.ts', code);
console.log('Admin UI block removed');
