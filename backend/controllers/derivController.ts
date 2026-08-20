import { Request, Response } from 'express';
import { derivSocket } from '../websocket/derivSocket.ts';
import crypto from 'crypto';

// Memória temporária para armazenar o code_verifier do PKCE (segurança)
const pkceStore = new Map<string, string>();

function base64URLEncode(str: Buffer): string {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export const derivController = {
  handleConnect: (req: Request, res: Response) => {
    const appId = process.env.DERIV_APP_ID; // V2 Client ID
    const redirectUri = 'https://fybot.life/api/deriv/oauth/callback';
    
    // Gerar PKCE verifier e challenge (Segurança V2)
    const verifier = base64URLEncode(crypto.randomBytes(32));
    const challenge = base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
    
    // Gerar um state único para amarrar a sessão
    const state = base64URLEncode(crypto.randomBytes(16));
    
    // Salvar em memória
    pkceStore.set(state, verifier);
    if (pkceStore.size > 1000) pkceStore.clear(); // Prevenir vazamento de memória

    // A URL oficial do V2 (auth.deriv.com)
    const oauthUrl = `https://auth.deriv.com/oauth2/auth?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256&scope=read%20trade`;
    
    console.log('[OAUTH V2] Usuário conectando... Redirecionando para:', oauthUrl);
    return res.redirect(oauthUrl);
  },

  handleOAuthCallback: async (req: Request, res: Response) => {
    try {
      const { code, state, error, error_description } = req.query;
      
      if (error) {
        return res.redirect('/?oauth=error_' + encodeURIComponent(String(error_description)));
      }

      if (!code || !state) {
        return res.redirect('/?oauth=error_missing_code_or_state');
      }

      // Recuperar o verifier salvo antes do redirecionamento
      const verifier = pkceStore.get(state as string);
      if (!verifier) {
        return res.redirect('/?oauth=error_invalid_state_session_expired');
      }
      
      pkceStore.delete(state as string);

      const appId = process.env.DERIV_APP_ID;
      const redirectUri = 'https://fybot.life/api/deriv/oauth/callback';

      // Trocar o código pelo Access Token no servidor da Deriv
      const tokenResponse = await fetch('https://auth.deriv.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: appId,
          code: code as string,
          redirect_uri: redirectUri,
          code_verifier: verifier
        })
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        console.error('Deriv Token Exchange Error:', tokenData);
        return res.redirect('/?oauth=error_token_exchange');
      }

      const accessToken = tokenData.access_token;
      
      // Conectar no WebSocket com o novo token!
      const authData = await derivSocket.authorizeAndFetchAccounts(appId, accessToken);
      const account = authData.loginid;
      
      console.log('Deriv V2 Authorization Successful for:', account);
      
      // Redireciona o usuário para o frontend logado
      return res.redirect(`/?oauth=success&token=${accessToken}&account=${account}`);
    } catch (err: any) {
      console.error('OAuth Callback Error:', err);
      return res.redirect('/?oauth=error_' + encodeURIComponent(err.message));
    }
  }
};
