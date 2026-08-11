const fs = require('fs');
const { execSync } = require('child_process');
try {
  const out = execSync('npx tsc --noEmit server.ts', { stdio: 'pipe' });
  fs.writeFileSync('compile_log.txt', 'SUCCESS: ' + out.toString());
} catch(e) {
  fs.writeFileSync('compile_log.txt', 'ERROR: ' + e.stdout.toString() + '\\nSTDERR: ' + e.stderr.toString());
}
