const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx tsc --noEmit', { stdio: 'pipe' });
  fs.writeFileSync('tsc_output.txt', 'SUCCESS:\n' + output.toString());
} catch (error) {
  fs.writeFileSync('tsc_output.txt', 'ERROR:\n' + error.stdout.toString() + '\n' + error.stderr.toString());
}
console.log('Done');
