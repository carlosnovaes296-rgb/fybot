const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.toString()));
  page.on('error', err => console.log('BROWSER ERROR:', err.toString()));

  await page.goto('https://fybot.life', { waitUntil: 'networkidle0' });
  console.log('Page loaded successfully');
  await browser.close();
})();
