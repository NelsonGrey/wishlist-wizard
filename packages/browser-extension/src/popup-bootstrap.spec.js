import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function loadBootstrapModule() {
  vi.resetModules();
  await import('./popup-bootstrap.js');
}

describe('popup-bootstrap.js', () => {
  let appendChildSpy;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    appendChildSpy?.mockRestore();
  });

  it('loads the legacy scripts as <script type="module"> tags, in the required order', async () => {
    const appended = [];
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((script) => {
      appended.push(script.src);
      script.onload();
      return script;
    });

    await loadBootstrapModule();
    // The bootstrap IIFE runs async work at module top-level -- flush the
    // microtask queue so the sequential await-loop completes.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // popup.js must load before popup-auth.js -- auth calls
    // window.checkProductPage() etc, which popup.js defines.
    // jsdom's real <script>.src IDL attribute resolves to an absolute URL
    // when read back, so assert on the filename rather than the raw
    // relative-path string that was assigned.
    const names = appended.map((src) => src.split('/').pop());
    expect(names).toEqual(['popup.js', 'popup-auth.js', 'coupons.js', 'comparison.js', 'popup-extra.js']);
  });

  it('sets type="module" on every injected script', async () => {
    const types = [];
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((script) => {
      types.push(script.type);
      script.onload();
      return script;
    });

    await loadBootstrapModule();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(types.every((t) => t === 'module')).toBe(true);
  });

  it('loads scripts sequentially, not all at once -- a later script is not appended until the earlier one resolves', async () => {
    const appended = [];
    let resolveFirst;
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((script) => {
      appended.push(script.src);
      if (appended.length === 1) {
        // Hold the first script's onload open -- if the loop were firing
        // all scripts in parallel rather than awaiting each one, more than
        // one script would show up in `appended` before we release this.
        resolveFirst = script.onload;
      } else {
        script.onload();
      }
      return script;
    });

    await loadBootstrapModule();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(appended).toHaveLength(1);

    resolveFirst();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(appended.length).toBeGreaterThan(1);
  });

  it('logs and stops loading further scripts when one fails to load', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const appended = [];
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((script) => {
      appended.push(script.src);
      if (appended.length === 2) {
        script.onerror();
      } else {
        script.onload();
      }
      return script;
    });

    await loadBootstrapModule();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(appended).toHaveLength(2); // stopped after the 2nd (failing) script
    expect(error).toHaveBeenCalledWith(
      'Failed to bootstrap popup scripts',
      expect.objectContaining({ message: expect.stringContaining('popup-auth.js') })
    );
  });
});
