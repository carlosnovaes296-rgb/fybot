const fs = require('fs');
const content = fs.readFileSync('c:/Users/sobit/OneDrive/Área de Trabalho/Fybot pro/src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.toLowerCase().includes('admin') || line.toLowerCase().includes('carlosnovaes296')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
