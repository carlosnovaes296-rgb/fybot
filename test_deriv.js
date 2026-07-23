const fs = require('fs');

async function testToken() {
  const token = 'pat_53557e778e4fc86a3a06489679108c4c37d8423420f2f96842a3d21855cad95e';
  const appId = '33TxY3I7FXDKJMpuS6uIC';

  try {
    const res = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Deriv-App-ID': appId
      }
    });
    
    const data = await res.json();
    fs.writeFileSync('deriv_test.json', JSON.stringify(data, null, 2));
    console.log('Success: Wrote to deriv_test.json');
  } catch (err) {
    console.error('Error:', err);
  }
}

testToken();
