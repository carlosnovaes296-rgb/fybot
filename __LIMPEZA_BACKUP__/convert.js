const fs = require('fs');
const path = require('path');

try {
  const logPath = path.join(__dirname, 'public', 'Fybot.log');
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf16le');
    fs.writeFileSync(path.join(__dirname, 'public', 'Fybot_utf8.log'), content, 'utf8');
    console.log('✅ Converted Fybot.log to Fybot_utf8.log');
  } else {
    console.log('❌ Fybot.log does not exist');
  }
} catch (e) {
  console.error('Error converting log:', e);
}

try {
  const mq5Path = path.join(__dirname, 'public', 'Fybot_utf8.mq5');
  if (fs.existsSync(mq5Path)) {
    const content = fs.readFileSync(mq5Path, 'utf16le');
    fs.writeFileSync(path.join(__dirname, 'public', 'Fybot_decoded.mq5'), content, 'utf8');
    console.log('✅ Decoded Fybot_utf8.mq5 to Fybot_decoded.mq5');
  } else {
    console.log('❌ Fybot_utf8.mq5 does not exist');
  }
} catch (e) {
  console.error('Error decoding mq5:', e);
}
