import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const getFirestore = vi.fn(() => ({ __type: 'db' }));
const doc = vi.fn((_db: unknown, path: string, id?: string) => ({ __type: 'doc', path, id }));
const collection = vi.fn((_db: unknown, path: string) => ({ __type: 'collection', path }));
const query = vi.fn((...args: unknown[]) => ({ __type: 'query', args }));
const where = vi.fn((field: string, op: string, value: unknown) => ({ __type: 'where', field, op, value }));
const orderBy = vi.fn((field: string, dir?: string) => ({ __type: 'orderBy', field, dir }));
const limit = vi.fn((n: number) => ({ __type: 'limit', n }));
const onSnapshot = vi.fn();
const addDoc = vi.fn();
const updateDoc = vi.fn();
const getDocs = vi.fn();
const Timestamp = { now: vi.fn(() => ({ toDate: () => new Date('2026-08-27'), __type: 'now' })) };

vi.mock('firebase/firestore', () => ({
  getFirestore: (...args: unknown[]) => getFirestore(...args),
  doc: (...args: unknown[]) => doc(...(args as [unknown, string, string?])),
  collection: (...args: unknown[]) => collection(...(args as [unknown, string])),
  query: (...args: unknown[]) => query(...args),
  where: (...args: unknown[]) => where(...(args as [string, string, unknown])),
  orderBy: (...args: unknown[]) => orderBy(...(args as [string, string?])),
  limit: (...args: unknown[]) => limit(...(args as [number])),
  onSnapshot: (...args: unknown[]) => onSnapshot(...args),
  addDoc: (...args: unknown[]) => addDoc(...args),
  updateDoc: (...args: unknown[]) => updateDoc(...args),
  getDocs: (...args: unknown[]) => getDocs(...args),
  Timestamp,
}));

let mockFirebaseApp: unknown = { __type: 'app' };
let mockCurrentUser: { uid: string } | null = { uid: 'user-1' };
vi.mock('@/lib/firebase', () => ({
  get firebaseApp() {
    return mockFirebaseApp;
  },
  getCurrentUser: () => mockCurrentUser,
}));

function fakeQueryDoc(id: string, data: Record<string, unknown>) {
  return { id, exists: () => true, data: () => data, ref: { __type: 'docRef', id } };
}

function fakeQuerySnapshot(docs: ReturnType<typeof fakeQueryDoc>[]) {
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: (cb: (d: ReturnType<typeof fakeQueryDoc>) => void) => docs.forEach(cb),
  };
}

async function loadFirestoreModule() {
  vi.resetModules();
  return import('@/lib/firestore');
}

describe('firestore.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFirebaseApp = { __type: 'app' };
    mockCurrentUser = { uid: 'user-1' };
  });

  describe('getFirestoreDb', () => {
    it('lazily initializes via getFirestore(firebaseApp) and memoizes the instance', async () => {
      const { getFirestoreDb } = await loadFirestoreModule();

      const db1 = getFirestoreDb();
      const db2 = getFirestoreDb();

      expect(getFirestore).toHaveBeenCalledTimes(1);
      expect(db1).toBe(db2);
    });

    it('throws when Firebase has not been configured', async () => {
      mockFirebaseApp = null;
      const { getFirestoreDb } = await loadFirestoreModule();

      expect(() => getFirestoreDb()).toThrow('Firestore not initialized');
    });
  });

  describe('useUserWishlists', () => {
    it('does nothing and clears state when no userId is given', async () => {
      const { useUserWishlists } = await loadFirestoreModule();
      const { result } = renderHook(() => useUserWishlists(undefined));

      expect(result.current.wishlists).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(onSnapshot).not.toHaveBeenCalled();
    });

    it('queries by userId ordered by createdAt desc and converts docs, numeric ids included', async () => {
      onSnapshot.mockImplementation((_q, onNext) => {
        onNext(
          fakeQuerySnapshot([
            fakeQueryDoc('42', { name: 'Birthday', createdAt: { toDate: () => new Date('2026-01-01') } }),
          ])
        );
        return vi.fn();
      });
      const { useUserWishlists } = await loadFirestoreModule();

      const { result } = renderHook(() => useUserWishlists('user-1'));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(where).toHaveBeenCalledWith('userId', '==', 'user-1');
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(result.current.wishlists).toEqual([
        expect.objectContaining({ id: 42, name: 'Birthday', createdAt: new Date('2026-01-01') }),
      ]);
    });

    it('preserves a non-numeric doc id as a string', async () => {
      onSnapshot.mockImplementation((_q, onNext) => {
        onNext(fakeQuerySnapshot([fakeQueryDoc('abc-def', { name: 'Shared' })]));
        return vi.fn();
      });
      const { useUserWishlists } = await loadFirestoreModule();

      const { result } = renderHook(() => useUserWishlists('user-1'));

      await waitFor(() => expect(result.current.wishlists).toHaveLength(1));
      expect(result.current.wishlists[0].id).toBe('abc-def');
    });

    it('surfaces a listener error', async () => {
      onSnapshot.mockImplementation((_q, _onNext, onError) => {
        onError(new Error('permission denied'));
        return vi.fn();
      });
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { useUserWishlists } = await loadFirestoreModule();

      const { result } = renderHook(() => useUserWishlists('user-1'));

      await waitFor(() => expect(result.current.error).toBe('permission denied'));
      expect(result.current.loading).toBe(false);
    });

    it('surfaces a synchronous setup error (e.g. Firestore not configured)', async () => {
      mockFirebaseApp = null;
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { useUserWishlists } = await loadFirestoreModule();

      const { result } = renderHook(() => useUserWishlists('user-1'));

      await waitFor(() => expect(result.current.error).toContain('Firestore not initialized'));
    });

    it('unsubscribes on unmount', async () => {
      const unsubscribe = vi.fn();
      onSnapshot.mockImplementation((_q, onNext) => {
        onNext(fakeQuerySnapshot([]));
        return unsubscribe;
      });
      const { useUserWishlists } = await loadFirestoreModule();

      const { unmount } = renderHook(() => useUserWishlists('user-1'));
      await waitFor(() => expect(onSnapshot).toHaveBeenCalled());
      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('useWishlistItems', () => {
    it('does nothing when no wishlistId is given', async () => {
      const { useWishlistItems } = await loadFirestoreModule();
      const { result } = renderHook(() => useWishlistItems(undefined));
      expect(result.current.items).toEqual([]);
      expect(onSnapshot).not.toHaveBeenCalled();
    });

    it('queries wishlistItems by wishlistId ordered by createdAt desc', async () => {
      onSnapshot.mockImplementation((_q, onNext) => {
        onNext(fakeQuerySnapshot([fakeQueryDoc('1', { title: 'Lego' })]));
        return vi.fn();
      });
      const { useWishlistItems } = await loadFirestoreModule();

      const { result } = renderHook(() => useWishlistItems(7));

      await waitFor(() => expect(result.current.items).toHaveLength(1));
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'wishlistItems');
      expect(where).toHaveBeenCalledWith('wishlistId', '==', 7);
    });
  });

  describe('useUserNotifications', () => {
    it('does nothing when no userId is given', async () => {
      const { useUserNotifications } = await loadFirestoreModule();
      const { result } = renderHook(() => useUserNotifications(undefined));
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it('subscribes to both the recent-notifications and unread-count queries', async () => {
      onSnapshot.mockImplementation((_q, onNext) => {
        // Both queries share the same fake handler shape here; distinguish
        // by whether the snapshot is consumed via .size (unread count) or
        // mapped via forEach (notification list) inside the hook itself.
        onNext(fakeQuerySnapshot([fakeQueryDoc('1', { title: 'Hi' })]));
        return vi.fn();
      });
      const { useUserNotifications } = await loadFirestoreModule();

      const { result } = renderHook(() => useUserNotifications('user-1', 5));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(limit).toHaveBeenCalledWith(5);
      expect(onSnapshot).toHaveBeenCalledTimes(2);
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.unreadCount).toBe(1);
    });
  });

  describe('useWishlistCollaborators', () => {
    it('queries collaborators by wishlistId with no ordering', async () => {
      onSnapshot.mockImplementation((_q, onNext) => {
        onNext(fakeQuerySnapshot([fakeQueryDoc('1', { userId: 'user-2' })]));
        return vi.fn();
      });
      const { useWishlistCollaborators } = await loadFirestoreModule();

      const { result } = renderHook(() => useWishlistCollaborators(3));

      await waitFor(() => expect(result.current.collaborators).toHaveLength(1));
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'collaborators');
      expect(where).toHaveBeenCalledWith('wishlistId', '==', 3);
    });
  });

  describe('useUserBeneficiaries', () => {
    it('queries beneficiaries by ownerId', async () => {
      onSnapshot.mockImplementation((_q, onNext) => {
        onNext(fakeQuerySnapshot([fakeQueryDoc('1', { name: 'Kid' })]));
        return vi.fn();
      });
      const { useUserBeneficiaries } = await loadFirestoreModule();

      const { result } = renderHook(() => useUserBeneficiaries('user-1'));

      await waitFor(() => expect(result.current.beneficiaries).toHaveLength(1));
      expect(where).toHaveBeenCalledWith('ownerId', '==', 'user-1');
    });
  });

  describe('useUserPriceAlerts', () => {
    it('queries priceAlerts by userId', async () => {
      onSnapshot.mockImplementation((_q, onNext) => {
        onNext(fakeQuerySnapshot([fakeQueryDoc('1', { itemId: 'i1' })]));
        return vi.fn();
      });
      const { useUserPriceAlerts } = await loadFirestoreModule();

      const { result } = renderHook(() => useUserPriceAlerts('user-1'));

      await waitFor(() => expect(result.current.priceAlerts).toHaveLength(1));
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'priceAlerts');
    });
  });

  describe('useDocument', () => {
    it('does nothing when no documentId is given', async () => {
      const { useDocument } = await loadFirestoreModule();
      const { result } = renderHook(() => useDocument('wishlists', undefined));
      expect(result.current.data).toBeNull();
      expect(onSnapshot).not.toHaveBeenCalled();
    });

    it('subscribes to a single document and converts it', async () => {
      onSnapshot.mockImplementation((_docRef, onNext) => {
        onNext({ exists: () => true, id: '5', data: () => ({ name: 'Solo' }) });
        return vi.fn();
      });
      const { useDocument } = await loadFirestoreModule();

      const { result } = renderHook(() => useDocument('wishlists', '5'));

      await waitFor(() => expect(result.current.data).toEqual(expect.objectContaining({ id: 5, name: 'Solo' })));
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'wishlists', '5');
    });

    it('sets data to null when the document does not exist', async () => {
      onSnapshot.mockImplementation((_docRef, onNext) => {
        onNext({ exists: () => false });
        return vi.fn();
      });
      const { useDocument } = await loadFirestoreModule();

      const { result } = renderHook(() => useDocument('wishlists', '5'));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toBeNull();
    });
  });

  describe('useActiveCollaborators', () => {
    it('does nothing when there is no current user', async () => {
      mockCurrentUser = null;
      onSnapshot.mockImplementation((_q, onNext) => {
        onNext(fakeQuerySnapshot([]));
        return vi.fn();
      });
      const { useActiveCollaborators } = await loadFirestoreModule();

      renderHook(() => useActiveCollaborators(3));

      expect(getDocs).not.toHaveBeenCalled();
    });

    it('updates the current user activity immediately and on a 30s interval, then clears it on unmount', async () => {
      vi.useFakeTimers();
      onSnapshot.mockImplementation((_q, onNext) => {
        onNext(fakeQuerySnapshot([]));
        return vi.fn();
      });
      getDocs.mockResolvedValue(fakeQuerySnapshot([fakeQueryDoc('c1', { userId: 'user-1' })]));
      const { useActiveCollaborators } = await loadFirestoreModule();

      const { unmount } = renderHook(() => useActiveCollaborators(3));
      await act(async () => {
        await Promise.resolve();
      });

      expect(getDocs).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }), { lastActive: expect.anything() });

      await act(async () => {
        vi.advanceTimersByTime(30000);
        await Promise.resolve();
      });
      expect(getDocs).toHaveBeenCalledTimes(2);

      unmount();
      await act(async () => {
        vi.advanceTimersByTime(60000);
        await Promise.resolve();
      });
      // No further calls after unmount clears the interval.
      expect(getDocs).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('filters collaborators to only those active within the last 2 minutes', async () => {
      const now = new Date('2026-08-27T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);
      onSnapshot.mockImplementation((_q, onNext) => {
        onNext(
          fakeQuerySnapshot([
            fakeQueryDoc('recent', { lastActive: { toDate: () => new Date(now.getTime() - 60_000) } }),
            fakeQueryDoc('stale', { lastActive: { toDate: () => new Date(now.getTime() - 5 * 60_000) } }),
          ])
        );
        return vi.fn();
      });
      getDocs.mockResolvedValue(fakeQuerySnapshot([]));
      const { useActiveCollaborators } = await loadFirestoreModule();

      const { result } = renderHook(() => useActiveCollaborators(3));
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.activeCollaborators).toHaveLength(1);
      expect(result.current.activeCollaborators[0].id).toBe('recent');
      vi.useRealTimers();
    });
  });

  describe('markNotificationAsRead', () => {
    it('updates isRead to true on the notification document', async () => {
      const { markNotificationAsRead } = await loadFirestoreModule();

      await markNotificationAsRead('n1');

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'notifications', 'n1');
      expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }), { isRead: true });
    });

    it('logs and rethrows on failure', async () => {
      updateDoc.mockRejectedValue(new Error('offline'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { markNotificationAsRead } = await loadFirestoreModule();

      await expect(markNotificationAsRead('n1')).rejects.toThrow('offline');
    });
  });

  describe('createNotification', () => {
    it('adds a notification document with defaults filled in', async () => {
      const { createNotification } = await loadFirestoreModule();

      await createNotification('user-1', 'item_purchased', 'Item purchased!', 'Someone bought your item');

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'user-1',
          type: 'item_purchased',
          title: 'Item purchased!',
          content: 'Someone bought your item',
          isRead: false,
          relatedEntityId: null,
          relatedEntityType: null,
          actionUrl: null,
        })
      );
    });

    it('derives relatedEntityId/Type from itemId when present in data', async () => {
      const { createNotification } = await loadFirestoreModule();

      await createNotification('user-1', 'item_purchased', 'Title', 'Content', { itemId: 'item-5', actionUrl: '/x' });

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ relatedEntityId: 'item-5', relatedEntityType: 'item', actionUrl: '/x' })
      );
    });

    it('derives relatedEntityId/Type from wishlistId when itemId is absent', async () => {
      const { createNotification } = await loadFirestoreModule();

      await createNotification('user-1', 'wishlist_shared', 'Title', 'Content', { wishlistId: 'w-9' });

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ relatedEntityId: 'w-9', relatedEntityType: 'wishlist' })
      );
    });

    it('logs and rethrows on failure', async () => {
      addDoc.mockRejectedValue(new Error('offline'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { createNotification } = await loadFirestoreModule();

      await expect(createNotification('user-1', 'x', 'Title', 'Content')).rejects.toThrow('offline');
    });
  });
});
