const http = require('http');

async function testPayment() {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // 1. Send a fake payment
    console.log("Sending POST /api/payments...");
    const postRes = await fetch('http://209.97.163.75/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 999,
        method: 'USDT BEP20',
        hash: '0xTestHashFromScript123',
        userId: '1' // Using admin user ID just for test
      })
    });
    
    console.log("POST Status:", postRes.status);
    const postData = await postRes.text();
    console.log("POST Response:", postData);
    
    // 2. We can't GET /api/admin/payments without adminAuth, so let's try to login first
    console.log("\nLogging in as Admin...");
    const loginRes = await fetch('http://209.97.163.75/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'carlosnovaes296@gmail.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginRes.json();
    console.log("Login User ID:", loginData.user?.id);
    
    if (loginData.user && loginData.user.id) {
      console.log("\nFetching GET /api/admin/payments...");
      const getRes = await fetch('http://209.97.163.75/api/admin/payments', {
        headers: { 'x-admin-userid': loginData.user.id }
      });
      console.log("GET Status:", getRes.status);
      const getData = await getRes.json();
      console.log("Payments Count:", getData.length);
      console.log("Pending Payments:", getData.filter(p => p.status === 'PENDING'));
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

testPayment();
