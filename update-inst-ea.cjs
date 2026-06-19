const fs = require('fs');

let ea = fs.readFileSync('public/downloads/FYBOT_V8_INSTITUTIONAL.mq5', 'utf8');
ea = ea.replace(/http:\/\/209\.97\.163\.75:3000\/api\/ea\/heartbeat/g, 'https://fybot.life/api/ea/heartbeat');
fs.writeFileSync('public/downloads/FYBOT_V8_INSTITUTIONAL.mq5', ea);
console.log('Institutional EA updated');
