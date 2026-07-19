import WebSocket from 'ws';
const token = "pat_a37911dd60b70707130cf4ee0af5f4be50c0f7024b09e2eba37034175e315b4e";
const appId = "33RBynhEChyZWoI6Z1g4x";

const urlsToTest = [
  `wss://ws.derivws.com/websockets/v3?app_id=${appId}&l=PT`,
  `wss://api.derivws.com/trading/v1/options/ws/public`,
  `wss://api.derivws.com/trading/v1/options/ws/demo`,
  `wss://ws.derivws.com/websockets/v3?app_id=1089&l=PT`
];

let currentIndex = 0;

function testNextUrl() {
  if (currentIndex >= urlsToTest.length) {
    console.log("\n[FIM] Todos os testes terminaram.");
    process.exit(0);
  }
  const url = urlsToTest[currentIndex++];
  console.log(`\n==========================================`);
  console.log(`Testando URL: ${url}`);
  
  try {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      console.log(`[Resultado] ❌ Timeout. O servidor ignorou a conexao.`);
      ws.close();
      testNextUrl();
    }, 5000);

    ws.on('open', () => {
      console.log(`[Conectado] Conexão aberta! Enviando seu token novo...`);
      ws.send(JSON.stringify({ authorize: token }));
    });

    ws.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.error) {
        console.log(`[Resultado] ❌ Erro da Deriv: ${parsed.error.message}`);
      } else if (parsed.msg_type === 'authorize') {
        console.log(`[Resultado] ✅ SUCESSO! A Deriv aceitou o Token nesta URL!`);
      } else {
        console.log(`[Mensagem] ${JSON.stringify(parsed)}`);
      }
      clearTimeout(timeout);
      ws.close();
      testNextUrl();
    });

    ws.on('error', (err) => {
      console.log(`[Resultado] ❌ Erro de Rede: ${err.message}`);
      clearTimeout(timeout);
      ws.close();
      testNextUrl();
    });

    ws.on('close', (code, reason) => {
      if(code !== 1000 && code !== 1005) {
        console.log(`[Resultado] ❌ Conexão fechada pela Deriv (Código: ${code})`);
      }
      clearTimeout(timeout);
      testNextUrl();
    });
  } catch (e) {
    console.log(`[Resultado] ❌ Falha no script: ${e.message}`);
    testNextUrl();
  }
}

testNextUrl();
