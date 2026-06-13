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
  // We want to replace Fybot -> IAbot, FYBOT -> IABOT, fybot -> iabot
  // Exclude 'fybot_db' because it's the database table
  
  content = content.replace(/FYBOT(?!_DB|_db)/g, 'IABOT');
  content = content.replace(/Fybot/g, 'IAbot');
  content = content.replace(/fybot(?!_db)/g, 'iabot');

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
    if (basename.toLowerCase().includes('fybot')) {
      const newBasename = basename.replace(/fybot/gi, (match) => {
        if (match === 'FYBOT') return 'IABOT';
        if (match === 'Fybot') return 'IAbot';
        return 'iabot';
      });
      const newFullPath = path.join(dir, newBasename);
      fs.renameSync(fullPath, newFullPath);
      console.log(`Renamed ${fullPath} to ${newFullPath}`);
    }
  });
};

renameFiles(__dirname);
