const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const backupDir = path.join(rootDir, '__LIMPEZA_BACKUP__');

if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

// Arquivos extremamente importantes que DEVEM ficar na raiz
const keepFiles = new Set([
    'package.json',
    'package-lock.json',
    'server.ts',
    'vite.config.ts',
    'tsconfig.json',
    '.env',
    '.env.example',
    '.gitignore',
    'README.md',
    'DerivBotEngineEMA.ts',
    'ENVIAR_CORRECOES_SEGURAS.cjs',
    'index.html',
    '__LIMPEZA_BACKUP__', // never move the backup dir itself
    'executar_limpeza.cjs'
]);

const allowedExtensionsToMove = ['.bat', '.cjs', '.js', '.mjs', '.py', '.ps1', '.txt', '.swf', '.mp4', '.png', '.xml', '.html', '.ts', '.tsx', '.log'];

const files = fs.readdirSync(rootDir);
let movedCount = 0;

for (const file of files) {
    if (keepFiles.has(file)) continue;
    
    const filePath = path.join(rootDir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isFile()) {
        const ext = path.extname(file).toLowerCase();
        
        // Verifica se a extensao eh um tipo de arquivo lixo/script ou se eh um tsx solto na raiz
        if (allowedExtensionsToMove.includes(ext) || file.includes('_backup') || file.includes('stash_')) {
            const newPath = path.join(backupDir, file);
            try {
                fs.renameSync(filePath, newPath);
                movedCount++;
            } catch (err) {
                console.error(`Erro ao mover ${file}:`, err.message);
            }
        }
    }
}

console.log(`Limpeza concluida! ${movedCount} arquivos movidos para __LIMPEZA_BACKUP__.`);
// Self cleanup
fs.renameSync(path.join(rootDir, 'executar_limpeza.cjs'), path.join(backupDir, 'executar_limpeza.cjs'));
