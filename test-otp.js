// Script para testar o fluxo OTP completo da nova API Deriv
const token = "pat_7992dbef5066193b4eae20c2d4322fdaf1816df6bb83a81acef3c83c967342f5";
const appId = "33RBynhEChyZWoI6Z1g4x";
const BASE = "https://api.derivws.com/trading/v1";

const headers = {
  'Authorization': `Bearer ${token}`,
  'Deriv-App-ID': appId,
  'Content-Type': 'application/json',
};

async function run() {
  // PASSO 1: Listar contas para achar o accountId correto
  console.log("\n=== PASSO 1: GET /options/accounts ===");
  const accRes = await fetch(`${BASE}/options/accounts`, { headers });
  const accData = await accRes.json();
  console.log(`[HTTP ${accRes.status}]`);
  console.log(JSON.stringify(accData, null, 2));

  if (!accRes.ok) {
    console.log("\n❌ Falhou ao listar contas. Parando.");
    return;
  }

  // Encontrar conta REAL (não virtual)
  const accounts = accData.accounts || accData.data || accData || [];
  const realAccount = Array.isArray(accounts)
    ? accounts.find(a => !a.is_virtual && (a.account_type === 'real' || a.type === 'real'))
    : null;

  console.log("\n[Conta Real encontrada]:", JSON.stringify(realAccount, null, 2));
  
  const accountId = realAccount?.id || realAccount?.account_id || realAccount?.loginid;
  
  if (!accountId) {
    console.log("\n❌ Não foi possível identificar o accountId da conta real.");
    console.log("Contas disponíveis:", JSON.stringify(accounts, null, 2));
    return;
  }

  console.log(`\n✅ AccountId da conta real: ${accountId}`);

  // PASSO 2: Pedir OTP
  console.log(`\n=== PASSO 2: POST /options/accounts/${accountId}/otp ===`);
  const otpRes = await fetch(`${BASE}/options/accounts/${accountId}/otp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  });
  const otpData = await otpRes.json();
  console.log(`[HTTP ${otpRes.status}]`);
  console.log(JSON.stringify(otpData, null, 2));

  if (!otpRes.ok) {
    console.log("\n❌ Falhou ao obter OTP.");
    return;
  }

  // PASSO 3: Conectar no WebSocket usando URL retornada
  const wsUrl = otpData.ws_url || otpData.websocket_url || otpData.url;
  if (!wsUrl) {
    console.log("\n❌ URL do WebSocket não encontrada na resposta OTP.");
    return;
  }

  console.log(`\n=== PASSO 3: Conectando no WebSocket ===`);
  console.log(`URL: ${wsUrl.replace(/otp=[^&]+/, 'otp=***')}`);

  const { default: WebSocket } = await import('ws');
  const ws = new WebSocket(wsUrl);

  const timeout = setTimeout(() => {
    console.log("\n❌ Timeout - servidor não respondeu em 8s.");
    ws.close();
    process.exit(1);
  }, 8000);

  ws.on('open', () => {
    console.log("\n✅ WebSocket CONECTADO! Aguardando resposta do servidor...");
  });

  ws.on('message', (data) => {
    const parsed = JSON.parse(data.toString());
    console.log("\n[Resposta do Servidor]:", JSON.stringify(parsed, null, 2));
    clearTimeout(timeout);
    ws.close();
    process.exit(0);
  });

  ws.on('error', (err) => {
    console.log(`\n❌ Erro WebSocket: ${err.message}`);
    clearTimeout(timeout);
    process.exit(1);
  });

  ws.on('close', (code) => {
    console.log(`\n[WS Fechado] Código: ${code}`);
    clearTimeout(timeout);
  });
}

run().catch(err => {
  console.log(`\n❌ Erro inesperado: ${err.message}`);
  process.exit(1);
});
