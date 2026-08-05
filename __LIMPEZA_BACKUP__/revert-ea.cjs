const fs = require('fs');

const filesToUpdate = [
  'public/Fybot.mq5',
  'public/downloads/FYBOT_V8_INSTITUTIONAL.mq5'
];

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/https:\/\/fybot\.life\/api\/ea\/heartbeat/g, 'http://209.97.163.75:3000/api/ea/heartbeat');
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
