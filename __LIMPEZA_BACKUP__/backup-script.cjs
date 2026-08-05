const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    const elements = fs.readdirSync(from);
    for (const element of elements) {
        if (element === 'node_modules' || element === '.git' || element === 'dist') continue;
        const fromPath = path.join(from, element);
        const toPath = path.join(to, element);
        if (fs.lstatSync(fromPath).isFile()) {
            fs.copyFileSync(fromPath, toPath);
        } else if (fs.lstatSync(fromPath).isDirectory()) {
            copyFolderSync(fromPath, toPath);
        }
    }
}

const source = "c:\\Users\\sobit\\OneDrive\\Área de Trabalho\\Fybot pro";
const target = "c:\\Users\\sobit\\OneDrive\\Área de Trabalho\\Fybot_Backup_Seguranca";

console.log('Iniciando cópia de backup (ignorando node_modules)...');
copyFolderSync(source, target);
console.log('Backup concluído com sucesso em:', target);
