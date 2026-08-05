const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado. Verificando logs do build...');
  
  conn.exec('cd /root/fybot && NODE_OPTIONS=--max-old-space-size=1024 npm run build > build_log.txt 2>&1', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code) => {
      conn.exec('cat /root/fybot/build_log.txt', (err2, stream2) => {
         if (err2) throw err2;
         let output = '';
         stream2.on('data', (data) => output += data.toString());
         stream2.on('close', () => {
             console.log("=== SAIDA DO BUILD ===");
             console.log(output);
             conn.end();
         });
      });
    });
  });
}).on('error', (err) => {
  console.log('❌ Erro:', err.message);
}).connect({
  host: '209.97.163.75',
  port: 22,
  username: 'root',
  password: '1BJPkXYBRk2026@26H',
  readyTimeout: 30000
});
