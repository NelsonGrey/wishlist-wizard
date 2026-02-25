// Direct script paths for Firefox MV2 compatibility
// IMPORTANT: popup.js must load BEFORE popup-auth.js so auth can call window.checkProductPage() etc
const legacyScriptUrls = [
  './popup.js',           // Load first - defines window.checkProductPage, window.updateAuthState
  './popup-auth.js',      // Load second - calls those functions after login
  './coupons.js',
  './comparison.js',
  './quick-add.js',
  './popup-extra.js'
];

async function loadLegacyScript(scriptUrl) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module'; // Load as ES module to avoid variable conflicts
    script.src = scriptUrl;
    script.async = false;
    script.onload = () => resolve(undefined);
    script.onerror = () => reject(new Error(`Failed to load script: ${scriptUrl}`));
    document.body.appendChild(script);
  });
}

async function bootstrapPopupScripts() {
  for (const scriptUrl of legacyScriptUrls) {
    await loadLegacyScript(scriptUrl);
  }
}

bootstrapPopupScripts().catch((error) => {
  console.error('Failed to bootstrap popup scripts', error);
});
