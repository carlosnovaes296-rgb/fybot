const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });
    
    page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.message);
    });

    console.log('Navigating to http://209.97.163.75:3000...');
    await page.goto('http://209.97.163.75:3000', { waitUntil: 'networkidle0', timeout: 10000 });
    
    console.log('Typing credentials...');
    await page.type('input[type="email"]', 'carlosnovaes296@gmail.com');
    await page.type('input[type="password"]', '123456');
    
    console.log('Clicking login...');
    await page.click('button.w-full.py-3');
    
    console.log('Waiting for network...');
    await page.waitForTimeout(3000); // wait for 3 seconds to capture any crashes after login
    
    console.log('Done testing droplet.');
    
    await browser.close();
  } catch (err) {
    console.error('PUPPETEER ERROR:', err);
  }
})();
