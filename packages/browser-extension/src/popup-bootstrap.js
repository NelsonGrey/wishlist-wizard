import popupAuthScriptUrl from './popup-auth.js?url';
import couponsScriptUrl from './coupons.js?url';
import comparisonScriptUrl from './comparison.js?url';
import quickAddScriptUrl from './quick-add.js?url';
import popupExtraScriptUrl from './popup-extra.js?url';
import popupScriptUrl from './popup.js?url';

const legacyScriptUrls = [
  popupAuthScriptUrl,
  couponsScriptUrl,
  comparisonScriptUrl,
  quickAddScriptUrl,
  popupExtraScriptUrl,
  popupScriptUrl
];

async function loadLegacyScript(scriptUrl) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
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
