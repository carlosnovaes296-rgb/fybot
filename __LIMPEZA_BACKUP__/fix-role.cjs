const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Fix API status
code = code.replace(
  /systemBlocked: \(users\.find\(u => u\.id === userId\)\?\.isAdmin\) \? false : state\.systemBlocked,/g,
  `systemBlocked: (users.find(u => u.id === userId)?.role === 'ADMIN') ? false : state.systemBlocked,`
);

// Fix Heartbeat
code = code.replace(
  /const isAdmin = userObj && userObj\.isAdmin === true;/g,
  `const isAdmin = userObj && userObj.role === 'ADMIN';`
);

fs.writeFileSync('server.ts', code);
console.log('Fixed role check');
