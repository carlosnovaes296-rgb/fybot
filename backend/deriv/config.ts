import dotenv from "dotenv";

dotenv.config();

export default {
    appId: process.env.DERIV_APP_ID || "",
    redirectUri: process.env.DERIV_REDIRECT_URI || "",
    wsUrl: "wss://ws.derivws.com/websockets/v3",
    oauthUrl: "https://oauth.deriv.com/oauth2/authorize"
};
