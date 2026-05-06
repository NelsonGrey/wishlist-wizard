import { describe, expect, it } from 'vitest';
import {
  isCollaborationActivityNotificationType,
  toCollaborationActivityEvent,
} from '../collaboration.js';

describe('collaboration activity contract', () => {
  it('accepts known collaboration activity types', () => {
    expect(isCollaborationActivityNotificationType('item_added')).toBe(true);
    expect(isCollaborationActivityNotificationType('COLLABORATOR_ADDED')).toBe(true);
  });

  it('rejects non-collaboration activity types', () => {
    expect(isCollaborationActivityNotificationType('price_drop')).toBe(false);
    expect(isCollaborationActivityNotificationType(undefined)).toBe(false);
  });

  it('normalizes valid notifications into collaboration events', () => {
    const event = toCollaborationActivityEvent({
      type: 'ITEM_RESERVED',
      title: 'Reserved',
      content: 'Someone reserved an item.',
      createdAt: '2026-05-06T12:00:00.000Z',
    });

    expect(event).not.toBeNull();
    expect(event?.type).toBe('item_reserved');
    expect(event?.title).toBe('Reserved');
  });

  it('returns null for unsupported notification types', () => {
    const event = toCollaborationActivityEvent({
      type: 'price_drop',
      title: 'Price changed',
      content: 'A price changed',
    });

    expect(event).toBeNull();
  });
});