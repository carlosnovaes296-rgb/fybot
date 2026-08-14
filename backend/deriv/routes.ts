import { Router } from "express";
import { getOAuthURL, generatePKCE } from "./oauth.ts";
import config from "./config.ts";

const router = Router();

// Rota de login OAuth - usa App ID 33RnO3OxGcvL8DIYeklO0
router.get("/login", (req, res) => {
    const { appId } = req.query;
    const state = Date.now().toString();
    res.redirect(getOAuthURL(state, ''));
});

// Callback: Deriv devolve os tokens diretamente na URL
// Formato: ?acct1=CR...&token1=a1-...&cur1=USD&acct2=VRT...&token2=a1-...&cur2=USD
router.get("/callback", async (req, res) => {
    try {
        const { token1, acct1, cur1, token2, acct2, cur2 } = req.query;

        if (!token1) {
            console.error("Callback sem token:", req.query);
            return res.redirect('/?error=no_token');
        }

        // Redireciona para o frontend com os tokens recebidos
        const params = new URLSearchParams();
        if (token1) params.set('token1', token1 as string);
        if (acct1)  params.set('acct1',  acct1  as string);
        if (cur1)   params.set('cur1',   cur1   as string);
        if (token2) params.set('token2', token2 as string);
        if (acct2)  params.set('acct2',  acct2  as string);
        if (cur2)   params.set('cur2',   cur2   as string);

        return res.redirect(`/?${params.toString()}`);

    } catch (error) {
        console.error("Callback Error:", error);
        res.status(500).send("Erro interno ao processar o login da Deriv.");
    }
});

// ============================================================
// ROTA OTP: Obtém URL do WebSocket via OTP (novo fluxo da API v1)
// O frontend chama este endpoint para obter a URL de conexão
// ============================================================
router.post("/otp", async (req, res) => {
    try {
        const { patToken, appId, accountId } = req.body;

        if (!patToken || !appId) {
            return res.status(400).json({ error: { message: 'patToken e appId são obrigatórios' } });
        }

        const headers: Record<string, string> = {
            'Authorization': `Bearer ${patToken}`,
            'Deriv-App-ID': appId,
            'Content-Type': 'application/json',
        };

        // Sempre busca as contas para obter o saldo atualizado
        const accountsRes = await fetch('https://api.derivws.com/trading/v1/options/accounts', { 
            headers
        });
        const textRes = await accountsRes.text();
        let accountsData: any;
        try {
            accountsData = JSON.parse(textRes);
        } catch (e) {
            return res.status(401).json({ error: { message: textRes || 'Invalid or expired token' } });
        }

        if (!accountsRes.ok) {
            return res.status(accountsRes.status).json({ error: accountsData });
        }

        const accounts: any[] = accountsData.data || [];
        const realAcc = accounts.find((a: any) => a.account_type === 'real');
        const demoAcc = accounts.find((a: any) => a.account_type === 'demo');

        const { accountType } = req.body;
        const targetAcc = accountType === 'DEMO' ? demoAcc : realAcc;

        // Usa accountId fornecido OU o da conta selecionada
        const resolvedAccountId = accountId || targetAcc?.account_id;
        if (!resolvedAccountId) {
            return res.status(404).json({ error: { message: `Conta ${accountType} não encontrada` } });
        }

        // Pede o OTP para a conta resolvida
        const otpRes = await fetch(
            `https://api.derivws.com/trading/v1/options/accounts/${resolvedAccountId}/otp`,
            { method: 'POST', headers, body: '{}' }
        );
        const otpData: any = await otpRes.json();

        if (!otpRes.ok) {
            return res.status(otpRes.status).json({ error: otpData });
        }

        // Retorna URL, accountId, saldo e info das contas para o frontend
        return res.json({
            data: {
                url: otpData.data?.url,
                account_id: resolvedAccountId,
                balance: targetAcc?.balance || '0',
                currency: targetAcc?.currency || 'USD',
                accounts: {
                    real: realAcc || null,
                    demo: demoAcc || null,
                }
            }
        });
    } catch (error: any) {
        console.error('[OTP Route Error]', error);
        return res.status(500).json({ error: { message: error.message } });
    }
});


// ============================================================
// ROTA ACCOUNTS: Lista contas da Deriv (real e demo)
// ============================================================
router.get("/accounts", async (req, res) => {
    try {
        const patToken = req.headers['x-pat-token'] as string;
        const appId = req.headers['x-app-id'] as string;

        if (!patToken || !appId) {
            return res.status(400).json({ error: { message: 'Headers x-pat-token e x-app-id são obrigatórios' } });
        }

        const accountsRes = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
            headers: {
                'Authorization': `Bearer ${patToken}`,
                'Deriv-App-ID': appId,
            }
        });
        const accountsData = await accountsRes.json();
        return res.json(accountsData);
    } catch (error: any) {
        return res.status(500).json({ error: { message: error.message } });
    }
});

export default router;
