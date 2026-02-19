import { chromium } from 'playwright';

const routes = ['/price-tracking-demo', '/price-tracking'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('console>', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('pageerror>', err.message));

  for (const route of routes) {
    const url = `http://localhost:5173${route}`;
    console.log('\n---', route, '---');
    let response = null;
    try {
      response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    } catch (err) {
      console.log('NAV ERROR', err.message);
    }

    if (response) {
      console.log('Status:', response.status(), 'URL:', response.url());
      const headers = response.headers();
      console.log('Content-Type:', headers['content-type']);
    } else {
      console.log('No network response object available.');
    }

    // Snapshot some DOM info
    const headerCount = await page.$$eval('header', els => els.length).catch(() => 0);
    const footerCount = await page.$$eval('footer', els => els.length).catch(() => 0);
    console.log('headerCount:', headerCount, 'footerCount:', footerCount);

    if (headerCount > 0) {
      const headerHTML = await page.$eval('header', el => el.outerHTML).catch(() => '');
      console.log('headerOuterHTML:', headerHTML.slice(0, 500).replace(/\n/g, ' '));
    }

    const title = await page.title().catch(() => '');
    console.log('title:', title);

    const html = await page.content();
    console.log('HTML snapshot (first 800 chars):\n', html.slice(0,800).replace(/\n/g,' '));
  }

  await browser.close();
})();
