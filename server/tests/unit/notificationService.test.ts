import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from '../../services/notificationService';
import { storage } from '../../storage';

vi.mock('../../storage', () => ({
  storage: {
    createNotification: vi.fn(async (data: any) => ({ id: 1, createdAt: new Date(), isRead: false, emailSent: false, emailStatus: null, ...data })),
    getUser: vi.fn(async (id: number) => ({ id, username: 'tester', displayName: 'Tester', email: 'tester@example.com' }))
  }
}));

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a system notification with content', async () => {
    const notification = await notificationService.createSystemNotification(1, 'System Title', 'Body content', { foo: 'bar' });
    expect(storage.createNotification).toHaveBeenCalledTimes(1);
    expect(storage.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 1,
      title: 'System Title',
      content: 'Body content',
      type: 'system_notification'
    }));
    expect(notification.content).toBe('Body content');
  });

  it('creates a price drop notification with structured data', async () => {
    const notification = await notificationService.createPriceDropNotification(1, 10, 'Gadget', '$50', '$40', 'http://example.com', 'http://example.com/img.jpg');
    expect(storage.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'price_drop',
      title: 'Price Drop: Gadget',
      content: expect.stringContaining('has dropped'),
      data: expect.objectContaining({ itemId: 10, newPrice: '$40' })
    }));
    expect(notification.type).toBe('price_drop');
  });
});