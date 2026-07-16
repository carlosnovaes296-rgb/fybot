import config from "./config";
import crypto from "crypto";

export function generatePKCE() {
    // Generate a secure random string for the code_verifier (between 43 and 128 characters)
    const verifier = crypto.randomBytes(32).toString('base64url');
    // Generate the code_challenge by taking the SHA256 hash of the verifier and base64url encoding it
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

export function getOAuthURL(state: string, codeChallenge: string) {
    return `${config.oauthUrl}` +
        `?client_id=${config.appId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
        `&state=${state}` +
        `&code_challenge_method=S256` +
        `&code_challenge=${codeChallenge}`;
}
