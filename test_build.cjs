const { exec } = require('child_process');
const fs = require('fs');

console.log('Running npm run build...');
exec('npx tsc --noEmit', (err, stdout, stderr) => {
    fs.writeFileSync('build_output.txt', stdout + '\n' + stderr);
    console.log('Done!');
});
