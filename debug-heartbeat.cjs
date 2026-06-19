const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(!isDCATrade && openCount === 0 && score >= config\.minScoreToEnter\) \{/g;

// Wait, the previous view_file showed:
// if (!isDCATrade && openCount === 0 && score >= config.minScoreToEnter) { ... }
// Wait, NO, the previous view_file showed:
// if (!isDCATrade && openCount === 0 && score >= config.minScore) {
