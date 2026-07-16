const https = require('https');

https.get('https://oauth.deriv.com/oauth2/authorize?app_id=33PBY8KUJHhfYg9Fhh11D&redirect_uri=https://fybot.life/api/deriv/callback', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});
