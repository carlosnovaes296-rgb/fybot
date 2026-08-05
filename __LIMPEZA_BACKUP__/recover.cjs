const fs = require('fs');
const path = 'c:/Users/sobit/.gemini/antigravity-ide/brain/7dcc6a92-3990-4007-84d0-2148611baf34/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(path, 'utf8').split('\n');
for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const obj = JSON.parse(line);
        if (obj.step_index === 703) {
            const content = obj.content;
            let start = content.indexOf('**\n * @license'); 
            if (start === -1) start = content.indexOf('/**');
            
            let code = content.substring(start);
            code = code.replace(/<\/USER_REQUEST>[\s\S]*$/, '');
            // Add the missing slash if it is missing
            if (code.startsWith('**')) {
                code = '/' + code;
            }
            fs.writeFileSync('c:/Users/sobit/OneDrive/Área de Trabalho/Fybot pro/src/App_recovered.tsx', code);
            console.log('RECOVERED App_recovered.tsx successfully! Size:', code.length);
        }
    } catch (e) {}
}
