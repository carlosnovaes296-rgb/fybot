const { execSync } = require('child_process');

console.log('========================================================');
console.log('🔄 PASSO 1: Construindo o site novo... (Por favor, aguarde)');
console.log('========================================================');

try {
  // Roda o build (npm run build)
  execSync('npm run build', { stdio: 'inherit', shell: true });
  
  console.log('\n========================================================');
  console.log('✅ PASSO 1 CONCLUÍDO! Site construído com sucesso!');
  console.log('🚀 PASSO 2: Enviando o site novo para o servidor...');
  console.log('========================================================\n');
  
  // Roda o upload
  require('./upload-frontend.cjs');

} catch (e) {
  console.log('\n❌ ERRO FATAL: Falha ao construir o site. Por favor, envie um print dessa tela.');
}
