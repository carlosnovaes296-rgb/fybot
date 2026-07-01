const fs = require('fs');
try {
  const content = fs.readFileSync('b64.txt', 'utf16le');
  console.log('Tamanho do texto decodificado:', content.length);
  console.log('Início do arquivo:', content.substring(0, 500));
} catch (e) {
  console.error(e);
}
