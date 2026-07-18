const https = require('https');

https.get('https://fybot.life/api/admin/users', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const users = JSON.parse(data);
      const user = users.find(u => u.email === 'admin@fybot.pro' || u.id === '1' || u.role === 'ADMIN');
      if (user) {
        console.log('=== SENHAS NO BANCO DE DADOS DA NUVEM ===');
        console.log('User:', user.name);
        console.log('Token Demo:', user.derivTokenDemo ? `SALVO (${user.derivTokenDemo})` : 'VAZIO');
        console.log('Token Real:', user.derivTokenReal ? `SALVO (${user.derivTokenReal})` : 'VAZIO');
      } else {
        console.log('Usuário admin não encontrado.');
      }
    } catch (e) {
      console.log('Erro ao ler API:', e.message, data);
    }
  });
}).on('error', (e) => {
  console.error("Erro de conexão:", e);
});
