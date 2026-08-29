import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleError, ErrorType, ErrorMessages, createErrorAction } from './error-handler.js';

describe('error-handler.js', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('handleError', () => {
    it('extracts the message from an Error instance', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'debug').mockImplementation(() => {});

      const info = handleError(new Error('boom'), 'popup', ErrorType.NETWORK);

      expect(info.message).toBe('boom');
      expect(info.context).toBe('popup');
      expect(info.type).toBe(ErrorType.NETWORK);
    });

    it('accepts a plain string as the error', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'debug').mockImplementation(() => {});

      const info = handleError('plain string error');

      expect(info.message).toBe('plain string error');
    });

    it('defaults context to "general" and type to UNKNOWN when omitted', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'debug').mockImplementation(() => {});

      const info = handleError('oops');

      expect(info.context).toBe('general');
      expect(info.type).toBe(ErrorType.UNKNOWN);
    });

    it('attaches the user-friendly title/message/action for the given error type', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'debug').mockImplementation(() => {});

      const info = handleError('need to sign in', 'popup', ErrorType.AUTH);

      expect(info.userMessage).toBe(ErrorMessages[ErrorType.AUTH].title);
      expect(info.userDescription).toBe(ErrorMessages[ErrorType.AUTH].message);
      expect(info.actionText).toBe(ErrorMessages[ErrorType.AUTH].action);
    });

    it('includes an ISO timestamp', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'debug').mockImplementation(() => {});

      const info = handleError('oops');

      expect(() => new Date(info.timestamp).toISOString()).not.toThrow();
      expect(info.timestamp).toBe(new Date(info.timestamp).toISOString());
    });

    it('logs the error and details for debugging', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});

      handleError('oops', 'content', ErrorType.PARSING, { url: 'https://example.com' });

      expect(error).toHaveBeenCalledWith(expect.stringContaining('content'), 'oops');
      expect(debug).toHaveBeenCalledWith(
        'Error details:',
        expect.objectContaining({ type: ErrorType.PARSING, details: { url: 'https://example.com' } })
      );
    });

    it('does not attempt to report the error outside production', () => {
      process.env.NODE_ENV = 'test';
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});

      handleError('oops');

      expect(debug).not.toHaveBeenCalledWith('Reporting error to server:', expect.anything());
    });

    it('reports the error when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const info = handleError('oops');

      // reportError is currently a stub -- it only logs, the real fetch()
      // call is commented out in source (never actually sends anything to
      // a server). This test documents that real behavior, not aspirational
      // behavior.
      expect(debug).toHaveBeenCalledWith('Reporting error to server:', info);
    });
  });

  describe('createErrorAction', () => {
    it('returns a function that invokes the given handler and returns its result', () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const handler = vi.fn(() => 'recovered');

      const action = createErrorAction(ErrorType.NETWORK, handler);
      const result = action();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(result).toBe('recovered');
    });

    it('logs which error type recovery is executing for', () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const action = createErrorAction(ErrorType.AUTH, () => {});

      action();

      expect(log).toHaveBeenCalledWith(expect.stringContaining(ErrorType.AUTH));
    });
  });

  describe('ErrorMessages', () => {
    it('defines a title/message/action for every ErrorType', () => {
      Object.values(ErrorType).forEach((type) => {
        expect(ErrorMessages[type]).toBeDefined();
        expect(ErrorMessages[type].title).toEqual(expect.any(String));
        expect(ErrorMessages[type].message).toEqual(expect.any(String));
        expect(ErrorMessages[type].action).toEqual(expect.any(String));
      });
    });
  });
});
