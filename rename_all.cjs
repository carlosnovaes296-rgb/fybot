const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist') && !file.includes('data')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.html') || file.endsWith('.py') || file.endsWith('.json') || file.endsWith('.md')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk(__dirname);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replacement logic:
  // We want to replace IAbot -> Fybot, IABOT -> FYBOT, iabot -> fybot
  // Exclude 'iabot_db' because it's the database table
  
  content = content.replace(/IABOT(?!_DB|_db)/g, 'FYBOT');
  content = content.replace(/IAbot/g, 'Fybot');
  content = content.replace(/iabot(?!_db)/g, 'fybot');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});

// Rename files
const renameFiles = (dir) => {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('dist')) {
        renameFiles(fullPath);
      }
    }
    
    const basename = path.basename(fullPath);
    if (basename.toLowerCase().includes('iabot')) {
      const newBasename = basename.replace(/iabot/gi, (match) => {
        if (match === 'IABOT') return 'FYBOT';
        if (match === 'IAbot') return 'Fybot';
        return 'fybot';
      });
      const newFullPath = path.join(dir, newBasename);
      fs.renameSync(fullPath, newFullPath);
      console.log(`Renamed ${fullPath} to ${newFullPath}`);
    }
  });
};

renameFiles(__dirname);
