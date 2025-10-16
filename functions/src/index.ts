import {setGlobalOptions} from "firebase-functions/v2";

// Set global options for all functions
setGlobalOptions({maxInstances: 10});

// =============================================================================
// AUTHENTICATION FUNCTIONS
// =============================================================================

export {
  createUserProfile,
  getUserProfile,
  updateUserProfile
} from './auth';

// =============================================================================
// CRUD FUNCTIONS (Generic Database Operations)
// =============================================================================

export {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
  batchCreateDocuments,
  batchUpdateDocuments
} from './crud';

// =============================================================================
// BUSINESS LOGIC FUNCTIONS
// =============================================================================

// Wishlist Management
export {
  createWishlist,
  getUserWishlists,
  getWishlist,
  updateWishlist,
  deleteWishlist,
  addWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  purchaseWishlistItem
} from './business/wishlist';
