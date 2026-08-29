import { beforeEach, describe, expect, it, vi } from 'vitest';

// firebase-service.ts is a thin wrapper over the Firestore/Auth SDKs -- we
// mock the SDK functions themselves (rather than a live emulator) to verify
// this wrapper calls them with the right query shape and correctly
// transforms Timestamp fields/snapshot docs into plain app objects.

const collection = vi.fn((_db: unknown, path: string) => ({ __type: 'collection', path }));
const doc = vi.fn((_db: unknown, path: string, id?: string) => ({ __type: 'doc', path, id }));
const query = vi.fn((...args: unknown[]) => ({ __type: 'query', args }));
const where = vi.fn((field: string, op: string, value: unknown) => ({ __type: 'where', field, op, value }));
const orderBy = vi.fn((field: string, dir?: string) => ({ __type: 'orderBy', field, dir }));
const limit = vi.fn((n: number) => ({ __type: 'limit', n }));
const getDocs = vi.fn();
const getDoc = vi.fn();
const addDoc = vi.fn();
const updateDoc = vi.fn();
const deleteDoc = vi.fn();
const onSnapshot = vi.fn();
const FAKE_NOW_DATE = new Date('2026-08-27T12:00:00.000Z');
const Timestamp = {
  now: vi.fn(() => ({ toDate: () => FAKE_NOW_DATE, __type: 'timestamp-now' })),
  fromDate: vi.fn((d: Date) => ({ toDate: () => d, __type: 'timestamp-from-date' })),
};

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ __type: 'db' })),
  collection: (...args: unknown[]) => collection(...(args as [unknown, string])),
  doc: (...args: unknown[]) => doc(...(args as [unknown, string, string?])),
  getDocs: (...args: unknown[]) => getDocs(...args),
  getDoc: (...args: unknown[]) => getDoc(...args),
  addDoc: (...args: unknown[]) => addDoc(...args),
  updateDoc: (...args: unknown[]) => updateDoc(...args),
  deleteDoc: (...args: unknown[]) => deleteDoc(...args),
  query: (...args: unknown[]) => query(...args),
  where: (...args: unknown[]) => where(...(args as [string, string, unknown])),
  orderBy: (...args: unknown[]) => orderBy(...(args as [string, string?])),
  limit: (...args: unknown[]) => limit(...(args as [number])),
  onSnapshot: (...args: unknown[]) => onSnapshot(...args),
  Timestamp,
}));

const currentUser = { uid: 'user-1' };
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser })),
}));

vi.mock('@/lib/firebase', () => ({
  firebaseApp: { __type: 'app' },
  firebaseAuth: { currentUser },
  firebaseFirestore: { __type: 'db' },
}));

const apiRequest = vi.fn();
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

function fakeDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data, ref: { __type: 'docRef', id } };
}

function fakeSnapshot(docs: ReturnType<typeof fakeDoc>[]) {
  return { docs, size: docs.length };
}

describe('firebase-service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser.uid = 'user-1';
  });

  describe('FirebaseWishlistService', () => {
    describe('getUserWishlists', () => {
      it('queries wishlists by userId ordered by updatedAt desc, and converts Timestamps to Dates', async () => {
        const { FirebaseWishlistService } = await import('@/lib/firebase-service');
        const createdAt = { toDate: () => new Date('2026-01-01') };
        const updatedAt = { toDate: () => new Date('2026-02-01') };
        getDocs.mockResolvedValue(
          fakeSnapshot([fakeDoc('w1', { name: 'Birthday', userId: 'user-1', createdAt, updatedAt })])
        );

        const result = await FirebaseWishlistService.getUserWishlists('user-1');

        expect(collection).toHaveBeenCalledWith(expect.anything(), 'wishlists');
        expect(where).toHaveBeenCalledWith('userId', '==', 'user-1');
        expect(orderBy).toHaveBeenCalledWith('updatedAt', 'desc');
        expect(result).toEqual([
          expect.objectContaining({
            id: 'w1',
            name: 'Birthday',
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-02-01'),
          }),
        ]);
      });
    });

    describe('getWishlistById', () => {
      it('returns the mapped wishlist when it exists', async () => {
        const { FirebaseWishlistService } = await import('@/lib/firebase-service');
        getDoc.mockResolvedValue({
          exists: () => true,
          id: 'w1',
          data: () => ({ name: 'Birthday', createdAt: { toDate: () => new Date('2026-01-01') } }),
        });

        const result = await FirebaseWishlistService.getWishlistById('w1');

        expect(doc).toHaveBeenCalledWith(expect.anything(), 'wishlists', 'w1');
        expect(result?.name).toBe('Birthday');
      });

      it('returns null when the document does not exist', async () => {
        const { FirebaseWishlistService } = await import('@/lib/firebase-service');
        getDoc.mockResolvedValue({ exists: () => false });

        const result = await FirebaseWishlistService.getWishlistById('missing');

        expect(result).toBeNull();
      });
    });

    describe('createWishlist', () => {
      it('stamps createdAt/updatedAt and converts occasionDate to a Timestamp', async () => {
        const { FirebaseWishlistService } = await import('@/lib/firebase-service');
        addDoc.mockResolvedValue({ id: 'new-w1' });
        const occasionDate = new Date('2026-12-25');

        const result = await FirebaseWishlistService.createWishlist('user-1', {
          name: 'Christmas',
          isPublic: false,
          isCollaborative: false,
          occasionDate,
        });

        expect(Timestamp.fromDate).toHaveBeenCalledWith(occasionDate);
        expect(addDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ name: 'Christmas', userId: 'user-1' })
        );
        expect(result).toEqual(
          expect.objectContaining({ id: 'new-w1', name: 'Christmas', userId: 'user-1', createdAt: FAKE_NOW_DATE })
        );
      });

      it('stores a null occasionDate when none is given', async () => {
        const { FirebaseWishlistService } = await import('@/lib/firebase-service');
        addDoc.mockResolvedValue({ id: 'new-w2' });

        await FirebaseWishlistService.createWishlist('user-1', {
          name: 'Just Because',
          isPublic: true,
          isCollaborative: false,
        });

        expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ occasionDate: null }));
      });
    });

    describe('updateWishlist', () => {
      it('stamps updatedAt and forwards other fields', async () => {
        const { FirebaseWishlistService } = await import('@/lib/firebase-service');

        await FirebaseWishlistService.updateWishlist('w1', { name: 'Renamed' });

        expect(doc).toHaveBeenCalledWith(expect.anything(), 'wishlists', 'w1');
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ name: 'Renamed', updatedAt: expect.anything() })
        );
      });
    });

    describe('deleteWishlist', () => {
      it('deletes all wishlist items before deleting the wishlist itself', async () => {
        const { FirebaseWishlistService } = await import('@/lib/firebase-service');
        getDocs.mockResolvedValue(fakeSnapshot([fakeDoc('i1', {}), fakeDoc('i2', {})]));

        await FirebaseWishlistService.deleteWishlist('w1');

        expect(deleteDoc).toHaveBeenCalledTimes(3); // 2 items + the wishlist itself
        expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }));
      });
    });

    describe('subscribeToUserWishlists', () => {
      it('wires onSnapshot and maps emitted docs through the callback', () => {
        const unsubscribe = vi.fn();
        onSnapshot.mockImplementation((_q, cb) => {
          cb(fakeSnapshot([fakeDoc('w1', { name: 'Birthday' })]));
          return unsubscribe;
        });

        return import('@/lib/firebase-service').then(({ FirebaseWishlistService }) => {
          const callback = vi.fn();
          const result = FirebaseWishlistService.subscribeToUserWishlists('user-1', callback);

          expect(callback).toHaveBeenCalledWith([expect.objectContaining({ id: 'w1', name: 'Birthday' })]);
          expect(result).toBe(unsubscribe);
        });
      });
    });

    describe('reserveItem / markItemPurchased', () => {
      it('reserveItem calls the reserve endpoint with useFirebaseFunctions', async () => {
        const { FirebaseWishlistService } = await import('@/lib/firebase-service');
        await FirebaseWishlistService.reserveItem('item-1', 'user-1');

        expect(apiRequest).toHaveBeenCalledWith('/api/items/item-1/reserve', {
          method: 'POST',
          body: { userId: 'user-1' },
          useFirebaseFunctions: true,
        });
      });

      it('markItemPurchased calls the purchase endpoint with useFirebaseFunctions', async () => {
        const { FirebaseWishlistService } = await import('@/lib/firebase-service');
        await FirebaseWishlistService.markItemPurchased('item-1', 'user-1');

        expect(apiRequest).toHaveBeenCalledWith('/api/items/item-1/purchase', {
          method: 'POST',
          body: { userId: 'user-1' },
          useFirebaseFunctions: true,
        });
      });
    });

    describe('addWishlistItem / updateWishlistItem / deleteWishlistItem', () => {
      it('addWishlistItem stamps timestamps and returns the created item', async () => {
        const { FirebaseWishlistService } = await import('@/lib/firebase-service');
        addDoc.mockResolvedValue({ id: 'item-1' });

        const result = await FirebaseWishlistService.addWishlistItem('w1', {
          title: 'Lego Set',
          priority: 'high',
        });

        expect(collection).toHaveBeenCalledWith(expect.anything(), 'wishlistItems');
        expect(result).toEqual(
          expect.objectContaining({ id: 'item-1', title: 'Lego Set', wishlistId: 'w1', createdAt: FAKE_NOW_DATE })
        );
      });

      it('deleteWishlistItem deletes the item document', async () => {
        const { FirebaseWishlistService } = await import('@/lib/firebase-service');
        await FirebaseWishlistService.deleteWishlistItem('item-1');
        expect(doc).toHaveBeenCalledWith(expect.anything(), 'wishlistItems', 'item-1');
        expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1' }));
      });
    });
  });

  describe('FirebaseNotificationService', () => {
    it('getUserNotifications queries by userId, ordered desc, with a limit', async () => {
      const { FirebaseNotificationService } = await import('@/lib/firebase-service');
      getDocs.mockResolvedValue(fakeSnapshot([fakeDoc('n1', { title: 'Hi' })]));

      const result = await FirebaseNotificationService.getUserNotifications('user-1', 10);

      expect(where).toHaveBeenCalledWith('userId', '==', 'user-1');
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(limit).toHaveBeenCalledWith(10);
      expect(result[0]).toEqual(expect.objectContaining({ id: 'n1', title: 'Hi' }));
    });

    it('markNotificationAsRead sets isRead true', async () => {
      const { FirebaseNotificationService } = await import('@/lib/firebase-service');
      await FirebaseNotificationService.markNotificationAsRead('n1');
      expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }), { isRead: true });
    });

    it('markAllNotificationsAsRead updates every unread notification', async () => {
      const { FirebaseNotificationService } = await import('@/lib/firebase-service');
      getDocs.mockResolvedValue(fakeSnapshot([fakeDoc('n1', {}), fakeDoc('n2', {})]));

      await FirebaseNotificationService.markAllNotificationsAsRead('user-1');

      expect(updateDoc).toHaveBeenCalledTimes(2);
      expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }), { isRead: true });
    });

    it('deleteNotification deletes the notification document', async () => {
      const { FirebaseNotificationService } = await import('@/lib/firebase-service');
      await FirebaseNotificationService.deleteNotification('n1');
      expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }));
    });

    it('getUnreadNotificationCount returns the snapshot size', async () => {
      const { FirebaseNotificationService } = await import('@/lib/firebase-service');
      getDocs.mockResolvedValue(fakeSnapshot([fakeDoc('n1', {}), fakeDoc('n2', {}), fakeDoc('n3', {})]));

      const result = await FirebaseNotificationService.getUnreadNotificationCount('user-1');

      expect(result).toBe(3);
    });

    it('subscribeToUserNotifications wires onSnapshot and maps emitted docs', async () => {
      const unsubscribe = vi.fn();
      onSnapshot.mockImplementation((_q, cb) => {
        cb(fakeSnapshot([fakeDoc('n1', { title: 'Hi' })]));
        return unsubscribe;
      });
      const { FirebaseNotificationService } = await import('@/lib/firebase-service');
      const callback = vi.fn();

      const result = FirebaseNotificationService.subscribeToUserNotifications('user-1', callback);

      expect(callback).toHaveBeenCalledWith([expect.objectContaining({ id: 'n1', title: 'Hi' })]);
      expect(result).toBe(unsubscribe);
    });
  });

  describe('getCurrentUserId / isAuthenticated', () => {
    it('getCurrentUserId returns the current user uid', async () => {
      const { getCurrentUserId } = await import('@/lib/firebase-service');
      expect(getCurrentUserId()).toBe('user-1');
    });

    it('isAuthenticated returns true when there is a current user', async () => {
      const { isAuthenticated } = await import('@/lib/firebase-service');
      expect(isAuthenticated()).toBe(true);
    });
  });
});
