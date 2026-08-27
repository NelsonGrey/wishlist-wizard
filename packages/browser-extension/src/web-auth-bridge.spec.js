import { beforeEach, describe, expect, it, vi } from 'vitest';

const TOKEN_EVENT = 'ww:auth-bridge-token';
const SIGNOUT_EVENT = 'ww:auth-bridge-signout';
const REQUEST_TOKEN_EVENT = 'ww:request-auth-token';

async function loadBridgeModule() {
  vi.resetModules();
  await import('./web-auth-bridge.js');
}

describe('web-auth-bridge.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.chrome;
    delete global.chrome;
  });

  it('asks the page for its current auth state as soon as it attaches', async () => {
    const listener = vi.fn();
    window.addEventListener(REQUEST_TOKEN_EVENT, listener);

    await loadBridgeModule();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(REQUEST_TOKEN_EVENT, listener);
  });

  it('relays a token event to the extension via chrome.runtime.sendMessage', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    global.chrome = { runtime: { sendMessage } };
    window.chrome = global.chrome;

    await loadBridgeModule();
    window.dispatchEvent(
      new CustomEvent(TOKEN_EVENT, { detail: { token: 'abc123', expiresAt: 999, userEmail: 'mark@example.com' } })
    );

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'WEB_AUTH_BRIDGE_TOKEN',
      token: 'abc123',
      expiresAt: 999,
      userEmail: 'mark@example.com',
    });
  });

  it('defaults expiresAt/userEmail to null when not provided', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    global.chrome = { runtime: { sendMessage } };
    window.chrome = global.chrome;

    await loadBridgeModule();
    window.dispatchEvent(new CustomEvent(TOKEN_EVENT, { detail: { token: 'abc123' } }));

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'WEB_AUTH_BRIDGE_TOKEN',
      token: 'abc123',
      expiresAt: null,
      userEmail: null,
    });
  });

  it('does nothing when the token event has no token in its detail', async () => {
    const sendMessage = vi.fn();
    global.chrome = { runtime: { sendMessage } };
    window.chrome = global.chrome;

    await loadBridgeModule();
    window.dispatchEvent(new CustomEvent(TOKEN_EVENT, { detail: {} }));
    window.dispatchEvent(new CustomEvent(TOKEN_EVENT));

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('relays a sign-out event with no payload', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    global.chrome = { runtime: { sendMessage } };
    window.chrome = global.chrome;

    await loadBridgeModule();
    window.dispatchEvent(new CustomEvent(SIGNOUT_EVENT));

    expect(sendMessage).toHaveBeenCalledWith({ type: 'WEB_AUTH_BRIDGE_SIGNOUT' });
  });

  it('does not let a rejected sendMessage promise become an unhandled rejection', async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error('service worker asleep'));
    global.chrome = { runtime: { sendMessage } };
    window.chrome = global.chrome;

    await loadBridgeModule();
    window.dispatchEvent(new CustomEvent(TOKEN_EVENT, { detail: { token: 'abc123' } }));

    // Let the microtask queue flush the rejected promise's .catch() handler.
    await new Promise((resolve) => setTimeout(resolve, 0));
    // No assertion needed beyond "this didn't throw" -- vitest fails the
    // test run on an unhandled rejection, so reaching this point is the pass.
    expect(sendMessage).toHaveBeenCalled();
  });

  it('does not throw when chrome.runtime.sendMessage itself throws synchronously (invalidated extension context)', async () => {
    global.chrome = {
      runtime: {
        sendMessage: () => {
          throw new Error('Extension context invalidated');
        },
      },
    };
    window.chrome = global.chrome;

    await loadBridgeModule();

    expect(() =>
      window.dispatchEvent(new CustomEvent(TOKEN_EVENT, { detail: { token: 'abc123' } }))
    ).not.toThrow();
  });
});
