import dotenv from "dotenv";

dotenv.config();

export default {
    appId: process.env.DERIV_OAUTH_APP_ID || "34bOZbDxJP7IkYh3EO6X0",
    // App ID local default fallback
    otpAppId: process.env.DERIV_APP_ID || "34bOZbDxJP7IkYh3EO6X0",
    redirectUri: process.env.DERIV_REDIRECT_URI || "https://fybot.life/api/deriv/callback",
    wsUrl: "wss://ws.derivws.com/websockets/v3",
    oauthUrl: "https://oauth.deriv.com/oauth2/authorize"
};
