import config from "./config.ts";
import crypto from "crypto";

export function generatePKCE() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

export function getOAuthURL(state: string, codeChallenge: string) {
    // Usa o appId OAuth (33RnO3OxGcvL8DIYeklO0) que estava funcionando
    return `${config.oauthUrl}` +
        `?app_id=${config.appId}` +
        `&l=EN` +
        `&brand=deriv` +
        `&state=${state}`;
}
