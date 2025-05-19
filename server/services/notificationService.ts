import { storage } from '../storage';
import { InsertNotification, Wishlist, WishlistItem, User } from '@shared/schema';

type NotificationType = 
  | 'wishlist_created' 
  | 'wishlist_updated' 
  | 'wishlist_shared' 
  | 'item_added' 
  | 'item_reserved'
  | 'item_purchased'
  | 'collaborator_added'
  | 'collaborator_removed'
  | 'comment_added';

/**
 * Creates a notification for a user
 */
export async function createNotification(
  userId: number,
  type: NotificationType,
  title: string,
  message: string,
  relatedEntityId?: number,
  relatedEntityType?: string,
  actionUrl?: string
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type,
    title,
    message,
    relatedEntityId,
    relatedEntityType,
    isRead: false,
    actionUrl
  };

  await storage.createNotification(notification);
}

/**
 * Notifies when a new wishlist is created
 */
export async function notifyWishlistCreated(
  userId: number,
  wishlist: Wishlist,
  creatorName: string
): Promise<void> {
  await createNotification(
    userId,
    'wishlist_created',
    'New Wishlist Created',
    `A new wishlist "${wishlist.name}" has been created by ${creatorName}.`,
    wishlist.id,
    'wishlist',
    `/wishlists/${wishlist.id}`
  );
}

/**
 * Notifies when a wishlist is updated
 */
export async function notifyWishlistUpdated(
  userId: number,
  wishlist: Wishlist,
  updaterName: string
): Promise<void> {
  await createNotification(
    userId,
    'wishlist_updated',
    'Wishlist Updated',
    `The wishlist "${wishlist.name}" has been updated by ${updaterName}.`,
    wishlist.id,
    'wishlist',
    `/wishlists/${wishlist.id}`
  );
}

/**
 * Notifies when a wishlist is shared with someone
 */
export async function notifyWishlistShared(
  userId: number,
  wishlist: Wishlist,
  sharerName: string
): Promise<void> {
  await createNotification(
    userId,
    'wishlist_shared',
    'Wishlist Shared With You',
    `${sharerName} has shared the wishlist "${wishlist.name}" with you.`,
    wishlist.id,
    'wishlist',
    `/wishlists/${wishlist.id}`
  );
}

/**
 * Notifies when an item is added to a wishlist
 */
export async function notifyItemAdded(
  userId: number,
  wishlistItem: WishlistItem,
  wishlistName: string,
  adderName: string
): Promise<void> {
  await createNotification(
    userId,
    'item_added',
    'New Item Added',
    `${adderName} added "${wishlistItem.title}" to the wishlist "${wishlistName}".`,
    wishlistItem.id,
    'wishlist_item',
    `/wishlists/${wishlistItem.wishlistId}`
  );
}

/**
 * Notifies when an item is reserved
 */
export async function notifyItemReserved(
  userId: number,
  wishlistItem: WishlistItem,
  wishlistName: string,
  reserverName: string
): Promise<void> {
  await createNotification(
    userId,
    'item_reserved',
    'Item Reserved',
    `${reserverName} has reserved "${wishlistItem.title}" from the wishlist "${wishlistName}".`,
    wishlistItem.id,
    'wishlist_item',
    `/wishlists/${wishlistItem.wishlistId}`
  );
}

/**
 * Notifies when an item is purchased
 */
export async function notifyItemPurchased(
  userId: number,
  wishlistItem: WishlistItem,
  wishlistName: string,
  purchaserName: string
): Promise<void> {
  await createNotification(
    userId,
    'item_purchased',
    'Item Purchased',
    `${purchaserName} has purchased "${wishlistItem.title}" from the wishlist "${wishlistName}".`,
    wishlistItem.id,
    'wishlist_item',
    `/wishlists/${wishlistItem.wishlistId}`
  );
}

/**
 * Notifies when a collaborator is added to a wishlist
 */
export async function notifyCollaboratorAdded(
  userId: number,
  wishlist: Wishlist,
  collaboratorName: string,
  adderName: string
): Promise<void> {
  await createNotification(
    userId,
    'collaborator_added',
    'Collaborator Added',
    `${adderName} added ${collaboratorName} as a collaborator to wishlist "${wishlist.name}".`,
    wishlist.id,
    'wishlist',
    `/wishlists/${wishlist.id}`
  );
}

/**
 * Notifies when a collaborator is removed from a wishlist
 */
export async function notifyCollaboratorRemoved(
  userId: number,
  wishlist: Wishlist,
  collaboratorName: string,
  removerName: string
): Promise<void> {
  await createNotification(
    userId,
    'collaborator_removed',
    'Collaborator Removed',
    `${removerName} removed ${collaboratorName} as a collaborator from wishlist "${wishlist.name}".`,
    wishlist.id,
    'wishlist',
    `/wishlists/${wishlist.id}`
  );
}

/**
 * Notifies collaborators and owner about changes to a wishlist
 */
export async function notifyWishlistCollaborators(
  wishlistId: number, 
  message: string,
  title: string,
  type: NotificationType,
  excludeUserId?: number
): Promise<void> {
  // Get wishlist details
  const wishlist = await storage.getWishlistById(wishlistId);
  if (!wishlist) return;
  
  // Notify the owner if they are not excluded
  if (wishlist.userId !== excludeUserId) {
    await createNotification(
      wishlist.userId,
      type,
      title,
      message,
      wishlistId,
      'wishlist',
      `/wishlists/${wishlistId}`
    );
  }
  
  // Get all collaborators
  const collaborators = await storage.getCollaborators(wishlistId);
  
  // Notify each collaborator except the one who triggered the notification
  for (const collaborator of collaborators) {
    if (collaborator.userId !== excludeUserId) {
      await createNotification(
        collaborator.userId,
        type,
        title,
        message,
        wishlistId,
        'wishlist',
        `/wishlists/${wishlistId}`
      );
    }
  }
}