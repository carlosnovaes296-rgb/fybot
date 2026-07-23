async function testTokens() {
  console.log("=== INICIANDO TESTE DE TOKENS ===");
  
  const tokens = {
    "SEU TOKEN AQUI (DEMO)": "pat_cb9cfecf64723d74f070c2072844da9abb91b66dca71e985ce0021a43e8f32a4",
    "SEU TOKEN AQUI (REAL)": "pat_27ec51f1312c5786a27c798d9a780f10e09a280fbdedb9e2dbbfd260f9a5f16a"
  };

  for (const [nome, token] of Object.entries(tokens)) {
    console.log(`\nTestando ${nome}...`);
    try {
      const res = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
        headers: { 'Authorization': 'Bearer ' + token, 'Deriv-App-ID': '33TxY3I7FXDKJMpuS6uIC' }
      });
      const data = await res.json();
      
      const accounts = data.accounts || data.data || data;
      if (Array.isArray(accounts)) {
        accounts.forEach(acc => {
          const id = acc.loginid || acc.account_id || "";
          const isVirtual = id.includes('VRT') || id.includes('VOT') || id.startsWith('VR') || acc.is_virtual ? 'SIM (DEMO)' : 'NÃO (REAL)';
          console.log(` -> Conta Encontrada: ${id} | Moeda: ${acc.currency} | É Virtual/Demo? ${isVirtual}`);
          console.log(`    [DADOS BRUTOS]:`, JSON.stringify(acc));
        });
      } else {
        console.log("Erro na resposta:", data);
      }
    } catch (e) {
      console.log("Erro na requisição:", e.message);
    }
  }
}

testTokens();
