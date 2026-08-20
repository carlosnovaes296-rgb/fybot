const fetch = require('node-fetch');

async function testLogin(email, password) {
    try {
        const res = await fetch('https://fybot.life/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        console.log('[' + email + '] Login with ' + password + ': ', data);
    } catch (e) {
        console.error(e);
    }
}

async function run() {
    await testLogin('carlosnovaes296@gmail.com', 'a@2026k@A');
    await testLogin('carlosnovaecs296@gmail.com', 'a@2026k@A');
    await testLogin('jfcn2020@gmail.com', 'a@2026k@A');
    await testLogin('carlosnovaes296@gmail.com', 'password123');
}

run();
