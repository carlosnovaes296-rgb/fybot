async function test() {
  try {
    const res = await fetch('http://209.97.163.75:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carlosnovaes296@gmail.com', password: 'password123' })
    });
    console.log('Status:', res.status);
    console.log('Headers:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('Body:', text);
  } catch (e) {
    console.error('Fetch Error:', e);
  }
}
test();
