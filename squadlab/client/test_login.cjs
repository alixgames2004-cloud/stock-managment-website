const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/lab1/login');
  
  await page.fill('input[type="email"]', 'ali.meziane@lab1.dz');
  await page.fill('input[type="password"]', 'student123');
  await page.click('button[type="submit"]');

  console.log('Clicked login, waiting...');
  await page.waitForTimeout(3000);
  
  await browser.close();
})();
