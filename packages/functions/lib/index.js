"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseWishlistItem = exports.deleteWishlistItem = exports.updateWishlistItem = exports.addWishlistItem = exports.deleteWishlist = exports.updateWishlist = exports.getWishlist = exports.getUserWishlists = exports.createWishlist = exports.batchUpdateDocuments = exports.batchCreateDocuments = exports.listDocuments = exports.deleteDocument = exports.updateDocument = exports.getDocument = exports.createDocument = exports.updateUserProfile = exports.getUserProfile = exports.createUserProfile = void 0;
const v2_1 = require("firebase-functions/v2");
// Set global options for all functions
(0, v2_1.setGlobalOptions)({ maxInstances: 10 });
// =============================================================================
// AUTHENTICATION FUNCTIONS
// =============================================================================
var auth_1 = require("./auth");
Object.defineProperty(exports, "createUserProfile", { enumerable: true, get: function () { return auth_1.createUserProfile; } });
Object.defineProperty(exports, "getUserProfile", { enumerable: true, get: function () { return auth_1.getUserProfile; } });
Object.defineProperty(exports, "updateUserProfile", { enumerable: true, get: function () { return auth_1.updateUserProfile; } });
// =============================================================================
// CRUD FUNCTIONS (Generic Database Operations)
// =============================================================================
var crud_1 = require("./crud");
Object.defineProperty(exports, "createDocument", { enumerable: true, get: function () { return crud_1.createDocument; } });
Object.defineProperty(exports, "getDocument", { enumerable: true, get: function () { return crud_1.getDocument; } });
Object.defineProperty(exports, "updateDocument", { enumerable: true, get: function () { return crud_1.updateDocument; } });
Object.defineProperty(exports, "deleteDocument", { enumerable: true, get: function () { return crud_1.deleteDocument; } });
Object.defineProperty(exports, "listDocuments", { enumerable: true, get: function () { return crud_1.listDocuments; } });
Object.defineProperty(exports, "batchCreateDocuments", { enumerable: true, get: function () { return crud_1.batchCreateDocuments; } });
Object.defineProperty(exports, "batchUpdateDocuments", { enumerable: true, get: function () { return crud_1.batchUpdateDocuments; } });
// =============================================================================
// BUSINESS LOGIC FUNCTIONS
// =============================================================================
// Wishlist Management
var wishlist_1 = require("./business/wishlist");
Object.defineProperty(exports, "createWishlist", { enumerable: true, get: function () { return wishlist_1.createWishlist; } });
Object.defineProperty(exports, "getUserWishlists", { enumerable: true, get: function () { return wishlist_1.getUserWishlists; } });
Object.defineProperty(exports, "getWishlist", { enumerable: true, get: function () { return wishlist_1.getWishlist; } });
Object.defineProperty(exports, "updateWishlist", { enumerable: true, get: function () { return wishlist_1.updateWishlist; } });
Object.defineProperty(exports, "deleteWishlist", { enumerable: true, get: function () { return wishlist_1.deleteWishlist; } });
Object.defineProperty(exports, "addWishlistItem", { enumerable: true, get: function () { return wishlist_1.addWishlistItem; } });
Object.defineProperty(exports, "updateWishlistItem", { enumerable: true, get: function () { return wishlist_1.updateWishlistItem; } });
Object.defineProperty(exports, "deleteWishlistItem", { enumerable: true, get: function () { return wishlist_1.deleteWishlistItem; } });
Object.defineProperty(exports, "purchaseWishlistItem", { enumerable: true, get: function () { return wishlist_1.purchaseWishlistItem; } });
//# sourceMappingURL=index.js.map