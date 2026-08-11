const mysql = require('mysql2/promise');

async function remove() {
    try {
        const conn = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: 'Fybot2026!',
            database: 'fybot_db'
        });
        
        console.log("Conectado ao banco de dados.");
        const [res] = await conn.execute('DELETE FROM users WHERE email = ?', ['jfcn0020@gmail.com']);
        console.log("Resultado da exclusão:", res);
        
        await conn.end();
    } catch (err) {
        console.error("Erro:", err);
    }
}
remove();
