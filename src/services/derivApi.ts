export const derivApi = {
  getOAuthUrl: (appId: string, redirectUri: string) => {
    return `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&redirect_uri=${redirectUri}`;
  },
  
  parseCallbackUrl: (url: string) => {
    const params = new URLSearchParams(url.split('?')[1]);
    const accounts = [];
    
    // Deriv returns acct1, token1, acct2, token2, etc.
    let i = 1;
    while (params.has(`acct${i}`) && params.has(`token${i}`)) {
      accounts.push({
        account: params.get(`acct${i}`),
        token: params.get(`token${i}`)
      });
      i++;
    }
    
    return accounts;
  }
};
