const { exec } = require('child_process');
exec('npx vite build', { cwd: 'c:/Users/sobit/OneDrive/Área de Trabalho/Fybot pro' }, (error, stdout, stderr) => {
  const fs = require('fs');
  fs.writeFileSync('c:/Users/sobit/OneDrive/Área de Trabalho/Fybot pro/build_output.txt', stdout + '\n' + stderr + '\n' + (error ? error.message : ''));
  console.log('Done');
});
