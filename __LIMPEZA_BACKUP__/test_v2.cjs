const token = "COLE_SEU_TOKEN_AQUI"; // Substitua pelo seu token PAT
const appId = "33TugiuCvNstgwHTJq8ox"; // Seu novo App ID V2
const origin = "https://fybot.life";
const BASE = "https://api.derivws.com/trading/v1";

console.log("Iniciando Teste Completo da API V2 (OTP)...");

async function testar() {
  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Deriv-App-ID': appId,
      'Origin': origin,
      'Content-Type': 'application/json'
    };

    // PASSO 1: Pegar a lista de contas para descobrir o account_id
    console.log("\n1. Buscando suas contas...");
    const resContas = await fetch(`${BASE}/options/accounts`, { headers });
    const contasData = await resContas.json();
    
    if (contasData.error) {
      console.error("Erro ao buscar contas:", contasData.error);
      return;
    }

    // Pega a primeira conta que vier (pode ser Demo ou Real)
    const contasArray = contasData.accounts || contasData.data || contasData;
    if (!contasArray || contasArray.length === 0) {
      console.error("Nenhuma conta encontrada para este token!");
      return;
    }

    const contaAlvo = contasArray[0];
    const accountId = contaAlvo.id || contaAlvo.account_id || contaAlvo.loginid;
    console.log(`✅ Conta encontrada! Account ID: ${accountId}`);

    // PASSO 2: Pedir a URL OTP já autenticada para essa conta
    console.log(`\n2. Solicitando URL OTP (autenticada) para a conta ${accountId}...`);
    const resOtp = await fetch(`${BASE}/options/accounts/${accountId}/otp`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({}) // Corpo vazio exigido pelo POST
    });
    
    const otpData = await resOtp.json();
    
    if (otpData.error) {
      console.error("Erro ao pedir OTP:", otpData.error);
      return;
    }

    const urlAutenticada = otpData.ws_url || otpData.websocket_url || otpData.url;
    console.log("\n🎉 SUCESSO! A Deriv devolveu a URL Mágica Autenticada:");
    console.log("👉", urlAutenticada);
    console.log("\n(Se conectarmos o nosso robô nesta URL, ele já entra logado na V2!)");

  } catch(e) {
    console.error("Erro crítico:", e.message);
  }
}

testar();
