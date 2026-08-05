import { chromium } from 'playwright';

const routes = [
  '/',
  '/extension',
  '/price-tracking-demo',
  '/mobile-app-demo',
  '/social-sharing-demo',
  '/app/price-tracking',
  '/price-tracking',
  '/dashboard',
  '/dashboard-firebase',
  '/wishlist/123',
  '/shared/abc',
  '/login',
  '/privacy-settings',
  '/contact'
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  console.log('Running smoke tests against http://localhost:5173');

  for (const route of routes) {
    const url = `http://localhost:5173${route}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle' , timeout: 15000});
    } catch (err) {
      console.log(`${route}\tERROR\t${err.message}`);
      continue;
    }

    const headerCount = await page.$$eval('header', els => els.length).catch(() => 0);
    const footerCount = await page.$$eval('footer', els => els.length).catch(() => 0);
    let headerText = '';
    if (headerCount > 0) {
      headerText = await page.$eval('header', el => el.innerText).catch(() => '');
    }
    const hasMarketing = /Sign Up|Sign in|Wishlist Wizard|Sign In|Sign up/i.test(headerText);

    console.log(`${route}\theaders:${headerCount}\tfooters:${footerCount}\tmarketing:${hasMarketing}`);
  }

  await browser.close();
})();
