const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\sobit\\OneDrive\\Área de Trabalho\\Fybot pro\\server.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('/api/status')) {
        console.log(`Line ${i+1}: ${line.trim()}`);
    }
});
