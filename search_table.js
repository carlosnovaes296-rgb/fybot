const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\sobit\\OneDrive\\Área de Trabalho\\Fybot pro\\src\\App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('Execuções Recentes') || line.includes('Recent Executions')) {
        for(let j=Math.max(0, i-5); j<Math.min(lines.length, i+30); j++) {
            console.log(`Line ${j+1}: ${lines[j]}`);
        }
    }
});
