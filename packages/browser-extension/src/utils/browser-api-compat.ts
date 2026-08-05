/**
 * Cross-Browser Extension API Compatibility Layer
 * 
 * This module provides a unified API that works across Chrome, Edge, Firefox, and Safari.
 * It automatically detects the browser and provides the correct API surface.
 * 
 * Usage:
 *   import { runtime, storage, tabs } from './browser-api-compat'
 *   
 *   // Works on all browsers
 *   runtime.sendMessage({ action: 'doSomething' })
 *   storage.local.get('key')
 */

// Type declarations for browser APIs
declare const chrome: any;
declare const browser: any;
declare const safari: any;

/**
 * Detect browser type
 */
function detectBrowser() {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    // Could be Chrome, Edge, or Firefox (with chrome compat shim)
    const isFirefox = typeof browser !== 'undefined' && browser.runtime;
    return isFirefox ? 'firefox' : 'chrome';
  }
  
  if (typeof browser !== 'undefined' && browser.runtime) {
    return 'firefox';
  }
  
  if (typeof safari !== 'undefined' && safari.extension) {
    return 'safari';
  }
  
  throw new Error('Unknown browser or extension API not available');
}

const BROWSER_TYPE = detectBrowser();

/**
 * Runtime API - Unified interface for chrome/browser.runtime
 * 
 * Handles differences:
 * - Message passing (chrome.runtime vs browser.runtime)
 * - Extension ID access
 * - Opening/closing popups
 */
export const runtime = {
  getBrowserAPI() {
    if (BROWSER_TYPE === 'firefox') {
      return browser.runtime;
    } else if (BROWSER_TYPE === 'safari') {
      return safari.extension.baseURL;
    }
    return chrome.runtime;
  },

  // Send message (returns Promise on all browsers)
  sendMessage(message: any, responseCallback?: any) {
    const api = this.getBrowserAPI();
    
    if (BROWSER_TYPE === 'firefox') {
      return browser.runtime.sendMessage(message).catch((err: any) => {
        console.error('Message send failed:', err);
        return null;
      });
    } else if (BROWSER_TYPE === 'safari') {
      return new Promise((resolve) => {
        safari.extension.dispatchMessage('message', message);
        // Safari doesn't support sync responses, resolve immediately
        resolve(null);
      });
    }
    
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response: any) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  },

  // Listen for messages
  onMessage: {
    addListener(callback: any) {
      if (BROWSER_TYPE === 'firefox') {
        browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
          const result = callback(message, sender);
          if (result instanceof Promise) {
            result.then(sendResponse);
          } else {
            sendResponse(result);
          }
          return true; // Keep channel open for async
        });
      } else if (BROWSER_TYPE === 'safari') {
        safari.extension.addEventListener('message', (event: any) => {
          callback(event.message, { tab: event.target });
        });
      } else {
        chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
          const result = callback(message, sender);
          if (result instanceof Promise) {
            result.then(sendResponse);
          } else {
            sendResponse(result);
          }
          return true;
        });
      }
    }
  },

  // Get extension ID
  getExtensionId() {
    if (BROWSER_TYPE === 'firefox') {
      // Firefox doesn't expose extension ID easily
      return browser.runtime.id;
    } else if (BROWSER_TYPE === 'safari') {
      return safari.extension.baseURL;
    }
    return chrome.runtime.id;
  },

  // Get extension URL
  getURL(path: any) {
    const api = this.getBrowserAPI();
    
    if (BROWSER_TYPE === 'firefox') {
      return browser.runtime.getURL(path);
    } else if (BROWSER_TYPE === 'safari') {
      return safari.extension.baseURL + path;
    }
    return chrome.runtime.getURL(path);
  }
};

/**
 * Storage API - Unified interface for chrome/browser.storage
 * 
 * Handles differences:
 * - Local storage (sync on Chrome/Edge, async on Firefox)
 * - Quota differences by browser
 * - Storage area differences
 */
export const storage = {
  getBrowserAPI() {
    if (BROWSER_TYPE === 'firefox') {
      return browser.storage;
    } else if (BROWSER_TYPE === 'safari') {
      // Safari uses standard localStorage or sessionStorage
      return {
        local: {
          storage: typeof localStorage !== 'undefined' ? localStorage : {}
        }
      };
    }
    return chrome.storage;
  },

  local: {
    get(keys: any) {
      const api = storage.getBrowserAPI();
      
      if (BROWSER_TYPE === 'firefox') {
        return browser.storage.local.get(keys);
      } else if (BROWSER_TYPE === 'safari') {
        // Safari fallback: use localStorage
        const result: Record<string, any> = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            const val = localStorage.getItem(key);
            if (val) result[key] = JSON.parse(val);
          });
        } else if (typeof keys === 'string') {
          const val = localStorage.getItem(keys);
          if (val) result[keys] = JSON.parse(val);
        }
        return Promise.resolve(result);
      }
      
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get(keys, (result: any) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result);
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    },

    set(items: any) {
      const api = storage.getBrowserAPI();
      
      if (BROWSER_TYPE === 'firefox') {
        return browser.storage.local.set(items);
      } else if (BROWSER_TYPE === 'safari') {
        Object.entries(items).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
        return Promise.resolve();
      }
      
      return new Promise<void>((resolve, reject) => {
        try {
          chrome.storage.local.set(items, (): void => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    },

    remove(keys: any) {
      if (BROWSER_TYPE === 'firefox') {
        return browser.storage.local.remove(keys);
      } else if (BROWSER_TYPE === 'safari') {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => localStorage.removeItem(key));
        return Promise.resolve();
      }
      
      return new Promise<void>((resolve, reject) => {
        try {
          chrome.storage.local.remove(keys, (): void => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    },

    clear() {
      if (BROWSER_TYPE === 'firefox') {
        return browser.storage.local.clear();
      } else if (BROWSER_TYPE === 'safari') {
        localStorage.clear();
        return Promise.resolve();
      }
      
      return new Promise<void>((resolve, reject) => {
        try {
          chrome.storage.local.clear((): void => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    }
  }
};

/**
 * Tabs API - Unified interface for chrome/browser.tabs
 */
export const tabs = {
  getBrowserAPI() {
    if (BROWSER_TYPE === 'firefox') {
      return browser.tabs;
    } else if (BROWSER_TYPE === 'safari') {
      return null; // Safari has limited tab API
    }
    return chrome.tabs;
  },

  query(queryInfo: any) {
    if (BROWSER_TYPE === 'firefox') {
      return browser.tabs.query(queryInfo);
    } else if (BROWSER_TYPE === 'safari') {
      return Promise.resolve([]);
    }
    
    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.query(queryInfo, (tabs: any) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tabs);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  },

  executeScript(tabId: any, details: any) {
    if (BROWSER_TYPE === 'firefox') {
      return browser.tabs.executeScript(tabId, details);
    } else if (BROWSER_TYPE === 'safari') {
      return Promise.reject('Safari does not support executeScript');
    }
    
    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.executeScript(tabId, details, (results: any) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(results);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }
};

/**
 * Notifications API - Cross-browser notifications
 */
export const notifications = {
  getBrowserAPI() {
    if (BROWSER_TYPE === 'firefox') {
      return browser.notifications;
    } else if (BROWSER_TYPE === 'safari') {
      return null; // Use standard Web Notifications
    }
    return chrome.notifications;
  },

  create(options: any) {
    if (BROWSER_TYPE === 'firefox') {
      return browser.notifications.create(options);
    } else if (BROWSER_TYPE === 'safari') {
      // Use Web Notifications API
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(options.title, options);
        return Promise.resolve('safari-notification');
      }
      return Promise.reject('Notifications not permitted');
    }
    
    return new Promise((resolve, reject) => {
      try {
        chrome.notifications.create(options, (id: any) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(id);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }
};

/**
 * Export current browser type for debugging/feature detection
 */
export const browserInfo = {
  type: BROWSER_TYPE,
  isChrome: BROWSER_TYPE === 'chrome',
  isFirefox: BROWSER_TYPE === 'firefox',
  isSafari: BROWSER_TYPE === 'safari',
  isEdge: false, // Edge uses same API as Chrome
};

/**
 * Example usage:
 * 
 * import { runtime, storage, browserInfo } from './browser-api-compat'
 * 
 * // Send message (works on all browsers)
 * runtime.sendMessage({ action: 'captureProduct', data: {...} })
 *   .then(response => console.log('Success:', response))
 *   .catch(err => console.error('Failed:', err))
 * 
 * // Store data (works on all browsers)
 * storage.local.set({ 'products': [product1, product2] })
 * 
 * // Check browser type
 * if (browserInfo.isFirefox) {
 *   // Firefox-specific code
 * }
 */
