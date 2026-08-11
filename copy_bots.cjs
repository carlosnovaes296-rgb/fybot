const fs = require('fs');
fs.copyFileSync('Fybot_Pro.mq5', 'public/Fybot_Pro.mq5');
fs.copyFileSync('Fybot_Sniper.mq5', 'public/Fybot_Sniper.mq5');
console.log('Files copied successfully.');
