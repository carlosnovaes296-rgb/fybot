import { Router } from "express";
import { getOAuthURL, generatePKCE } from "./oauth";
import config from "./config";

const router = Router();

router.get("/login", (req, res) => {
    // Generate PKCE for this login attempt
    const pkce = generatePKCE();
    
    // Save the code_verifier securely in the user's session
    (req.session as any).code_verifier = pkce.verifier;
    
    // Generate a secure state token
    const state = Date.now().toString();

    res.redirect(
        getOAuthURL(state, pkce.challenge)
    );
});

router.get("/callback", async (req, res) => {
    try {
        const code = req.query.code as string;
        
        // Em casos legados ou de fallback (quando Deriv devolve o token direto na URL)
        const legacyToken = req.query.token1 as string;
        const legacyAccount = req.query.acct1 as string;
        
        if (legacyToken) {
            return res.redirect(`/?token1=${legacyToken}&acct1=${legacyAccount}`);
        }
        
        if (!code) {
            return res.status(400).send(`Código de autorização OAuth (PKCE) não recebido da Deriv. Retorno: ${JSON.stringify(req.query)}`);
        }
        
        // Recover the code_verifier from the session
        const code_verifier = (req.session as any).code_verifier;
        
        if (!code_verifier) {
            return res.status(400).send("Sessão expirada ou code_verifier inválido. Por favor, tente fazer login novamente a partir do FyBot.");
        }
        
        // Prepare the payload for the token exchange
        // O Endpoint oficial da Deriv para trocar o code pelo token via OAuth 2.0 / OIDC
        const tokenEndpoint = "https://oauth.deriv.com/oauth2/token";
        
        const params = new URLSearchParams();
        params.append("client_id", config.appId);
        params.append("grant_type", "authorization_code");
        params.append("code", code);
        params.append("redirect_uri", config.redirectUri);
        params.append("code_verifier", code_verifier);
        
        // Fetch the Access Token from Deriv
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error("Deriv OAuth Exchange Error:", data);
            return res.status(500).send("Falha ao resgatar o Token na Deriv: " + JSON.stringify(data));
        }
        
        // data.access_token contém o token real para a conta
        const token = data.access_token;
        const account = data.client_id || data.account_id || "Deriv-PKCE";
        
        // Limpar o verifier da sessão por segurança
        delete (req.session as any).code_verifier;
        
        return res.redirect(`/?token1=${token}&acct1=${account}`);
        
    } catch (error) {
        console.error("Callback Error:", error);
        res.status(500).send("Erro interno ao processar o login da Deriv.");
    }
});

export default router;
