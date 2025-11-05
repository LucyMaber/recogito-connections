const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString(), err.stack));

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    // wait a bit for any runtime errors
    await page.waitForTimeout(2000);
  } catch (e) {
    console.error('Navigation failed:', e);
  }

  await browser.close();
})();
