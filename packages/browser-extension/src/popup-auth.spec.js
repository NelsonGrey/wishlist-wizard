import { beforeEach, describe, expect, it, vi } from 'vitest';

function buildLoginDom() {
  document.body.innerHTML = `
    <form id="login-form">
      <input id="username-input" value="mark@example.com" />
      <input id="password-input" value="secret" />
      <button id="login-button" type="submit">Login</button>
      <div id="login-error" class="hidden"></div>
    </form>
    <div id="user-info" class="hidden"></div>
    <span id="username"></span>
    <button id="logout-button" class="hidden"></button>
    <button id="web-login-button"></button>
  `;
}

function triggerDomReady() {
  window.dispatchEvent(new Event('DOMContentLoaded'));
}

describe('popup-auth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    buildLoginDom();
    window.isLoggedIn = false;
    window.userId = undefined;
    window.username = undefined;
  });

  it('handles successful login and triggers product check', async () => {
    const sendMessage = vi.fn((payload, cb) => {
      if (payload.action === 'authenticate') {
        cb({ success: true, userData: { id: 'u1', username: 'mark' } });
        return;
      }
      cb({ success: true });
    });

    global.chrome = { runtime: { sendMessage } };
    window.chrome = global.chrome;
    window.checkProductPage = vi.fn(async () => {});

    await import(`./popup-auth.js?case=success`);
    triggerDomReady();

    const form = document.getElementById('login-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(sendMessage).toHaveBeenCalled();
    expect(window.isLoggedIn).toBe(true);
    expect(window.userId).toBe('u1');
    expect(window.username).toBe('mark');
    expect(document.getElementById('username')?.textContent).toBe('mark');
    expect(window.checkProductPage).toHaveBeenCalled();
  });

  it('shows auth error and re-enables login button on failed login', async () => {
    const sendMessage = vi.fn((payload, cb) => {
      if (payload.action === 'authenticate') {
        cb({ success: false, error: 'Invalid credentials' });
        return;
      }
      cb({ success: false });
    });

    global.chrome = { runtime: { sendMessage } };
    window.chrome = global.chrome;

    await import(`./popup-auth.js?case=failure`);
    triggerDomReady();

    const form = document.getElementById('login-form');
    const button = document.getElementById('login-button');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(sendMessage).toHaveBeenCalled();
    expect(window.isLoggedIn).toBe(false);
    expect(button?.disabled).toBe(false);
    expect(button?.textContent).toBe('Login');
    expect(document.getElementById('login-error')?.textContent).toBe('Invalid credentials');
    expect(document.getElementById('login-error')?.classList.contains('hidden')).toBe(false);
  });
});
