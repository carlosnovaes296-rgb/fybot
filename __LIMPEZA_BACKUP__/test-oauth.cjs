const https = require('https');

const url = 'https://oauth.deriv.com/oauth2/authorize?app_id=33NhCSDORvcezQW4r9BKu&redirect_uri=https://fybot.life/api/deriv/oauth/callback&brand=deriv';

https.get(url, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Body snippet:', data.substring(0, 500));
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
