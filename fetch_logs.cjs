const { Client } = require('ssh2');

const conn = new Client();

console.log('Conectando ao VPS para buscar logs...');

conn.on('ready', () => {
    console.log('Conectado. Buscando pm2 logs...');
    conn.exec('/usr/lib/node_modules/pm2/bin/pm2 logs fybot --lines 500 --nostream', (err, stream) => {
        if (err) throw err;
        let logs = '';
        stream.on('close', () => {
            console.log('\n--- LOGS DA VPS ---\n');
            console.log(logs);
            conn.end();
        }).on('data', (data) => {
            logs += data.toString();
        }).stderr.on('data', (data) => {
            logs += data.toString();
        });
    });
}).on('error', (err) => {
    console.log('Erro de SSH:', err);
}).connect({
    host: '209.97.163.75',
    port: 22,
    username: 'root',
    password: '1BJPkXYBRk2026@26H',
    readyTimeout: 30000
});
