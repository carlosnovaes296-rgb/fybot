const { execSync } = require('child_process');
try {
  const out = execSync('npx tsc --noEmit server.ts', { stdio: 'pipe' });
  console.log('SUCCESS', out.toString());
} catch(e) {
  console.log('ERROR', e.stdout.toString(), e.stderr.toString());
}
