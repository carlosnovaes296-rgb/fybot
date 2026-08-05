const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    path.join(process.cwd(), 'DerivBotEngineEMA.ts'),
    path.join(process.cwd(), 'backend', 'services', 'DerivBotEngine.ts')
];

let updatedFiles = 0;

for (const file of filesToUpdate) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        // Armazenamos o tamanho original para conferir se mudou
        const originalLength = content.length;

        // Fazemos as substituicoes de M15 para M5 e 900 para 300
        content = content.replace(/M15/g, 'M5');
        content = content.replace(/granularity: 900/g, 'granularity: 300');
        
        fs.writeFileSync(file, content);
        console.log(`✅ Atualizado com sucesso: ${path.basename(file)}`);
        updatedFiles++;
    } else {
        console.log(`❌ Arquivo nao encontrado: ${file}`);
    }
}

if (updatedFiles > 0) {
    console.log(`\n🚀 Transformação para M5 concluída com sucesso! Agora você pode rodar o deploy.`);
}
