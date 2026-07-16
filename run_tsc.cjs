const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx tsc --noEmit', { encoding: 'utf-8', stdio: 'pipe' });
  fs.writeFileSync('tsc_output.txt', output);
  console.log("Success! Wrote to tsc_output.txt");
} catch (e) {
  fs.writeFileSync('tsc_output.txt', e.stdout || e.message);
  console.log("Failed! Wrote errors to tsc_output.txt");
}
