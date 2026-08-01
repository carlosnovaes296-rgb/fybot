const fs = require('fs');
const { execSync } = require('child_process');
try {
    console.log("Checking for TS errors...");
    execSync('npx tsc --noEmit src/App.tsx', { stdio: 'inherit', cwd: 'c:/Users/sobit/OneDrive/Área de Trabalho/Fybot pro' });
    console.log("NO TS ERRORS!");
} catch (e) {
    console.log("TS ERRORS FOUND!");
}
