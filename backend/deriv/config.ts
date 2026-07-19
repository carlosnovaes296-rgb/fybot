import dotenv from "dotenv";

dotenv.config();

export default {
    // App ID para OAuth (PKCE) - foi criado com redirect URL configurado
    appId: process.env.DERIV_OAUTH_APP_ID || "33RnO3OxGcvL8DIYeklO0",
    // App ID para REST/OTP API
    otpAppId: process.env.DERIV_APP_ID || "33RPEzjLRuclN8h2uH1fr",
    redirectUri: process.env.DERIV_REDIRECT_URI || "https://fybot.life/api/deriv/callback",
    wsUrl: "wss://ws.derivws.com/websockets/v3",
    oauthUrl: "https://oauth.deriv.com/oauth2/authorize"
};
