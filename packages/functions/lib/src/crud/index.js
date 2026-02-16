"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchUpdateDocuments = exports.batchCreateDocuments = exports.listDocuments = exports.deleteDocument = exports.updateDocument = exports.getDocument = exports.createDocument = void 0;
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
try {
    admin.initializeApp();
}
catch (error) {
    // App might already be initialized
    logger.info("Firebase Admin already initialized or error:", error);
}
/**
 * Authentication helpers for Firebase Functions
 */
class FunctionsAuthHelpers {
    /**
     * Verify user is authenticated and return user info
     * Throws HttpsError if not authenticated
     */
    static verifyAuthenticated(context) {
        if (!context.auth) {
            const { HttpsError } = require('firebase-functions');
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        return {
            uid: context.auth.uid,
            email: context.auth.token.email,
            token: context.auth.token
        };
    }
}
/**
 * Firestore CRUD helpers for Firebase Functions
 */
class FirestoreCrudHelpers {
    static getDb() {
        return admin.firestore();
    }
    /**
     * Create a document with standard metadata
     */
    static async createDocument(collection, data, userId, options) {
        const db = this.getDb();
        const documentData = Object.assign(Object.assign({}, data), { createdBy: userId, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        let docRef;
        if (options === null || options === void 0 ? void 0 : options.id) {
            docRef = db.collection(collection).doc(options.id);
            if (options === null || options === void 0 ? void 0 : options.merge) {
                await docRef.set(documentData, { merge: true });
            }
            else {
                await docRef.set(documentData);
            }
        }
        else {
            docRef = await db.collection(collection).add(documentData);
        }
        return {
            id: docRef.id,
            data: Object.assign(Object.assign({}, documentData), { id: docRef.id })
        };
    }
    /**
     * Get a document by ID
     */
    static async getDocument(collection, documentId) {
        const db = this.getDb();
        const doc = await db.collection(collection).doc(documentId).get();
        if (!doc.exists) {
            return null;
        }
        return Object.assign({ id: doc.id }, doc.data());
    }
    /**
     * Update a document
     */
    static async updateDocument(collection, documentId, data, options) {
        const db = this.getDb();
        const updateData = Object.assign(Object.assign({}, data), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        if (options === null || options === void 0 ? void 0 : options.merge) {
            await db.collection(collection).doc(documentId).set(updateData, { merge: true });
        }
        else {
            await db.collection(collection).doc(documentId).update(updateData);
        }
    }
    /**
     * Delete a document
     */
    static async deleteDocument(collection, documentId) {
        const db = this.getDb();
        await db.collection(collection).doc(documentId).delete();
    }
    /**
     * Query documents with filters
     */
    static async queryDocuments(collection, options) {
        const db = this.getDb();
        let query = db.collection(collection);
        // Apply filters
        if (options === null || options === void 0 ? void 0 : options.filters) {
            options.filters.forEach(filter => {
                query = query.where(filter.field, filter.operator, filter.value);
            });
        }
        // Apply ordering
        if (options === null || options === void 0 ? void 0 : options.orderBy) {
            query = query.orderBy(options.orderBy.field, options.orderBy.direction);
        }
        // Apply limit
        if (options === null || options === void 0 ? void 0 : options.limit) {
            query = query.limit(options.limit);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    /**
     * Batch operations
     */
    static async batchCreate(collection, documents, userId) {
        const db = this.getDb();
        const batch = db.batch();
        const results = [];
        for (const doc of documents) {
            const documentData = Object.assign(Object.assign({}, doc.data), { createdBy: userId, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            let docRef;
            if (doc.id) {
                docRef = db.collection(collection).doc(doc.id);
                batch.set(docRef, documentData);
            }
            else {
                docRef = db.collection(collection).doc();
                batch.set(docRef, documentData);
            }
            results.push({ id: docRef.id, data: Object.assign(Object.assign({}, documentData), { id: docRef.id }) });
        }
        await batch.commit();
        return results;
    }
    static async batchUpdate(collection, updates) {
        const db = this.getDb();
        const batch = db.batch();
        for (const update of updates) {
            const updateData = Object.assign(Object.assign({}, update.data), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            const docRef = db.collection(collection).doc(update.id);
            batch.update(docRef, updateData);
        }
        await batch.commit();
    }
}
/**
 * Create a new document in a collection
 */
exports.createDocument = functions.https.onCall(async (request) => {
    // Verify authentication using shared helpers
    const user = FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, data } = request.data;
    if (!collection || !data) {
        throw new Error("Collection and data are required");
    }
    try {
        // Use shared CRUD helpers
        const result = await FirestoreCrudHelpers.createDocument(collection, data, user.uid);
        logger.info(`Document created in ${collection}: ${result.id}`);
        return Object.assign({ success: true }, result);
    }
    catch (error) {
        logger.error("Error creating document:", error);
        throw new Error("Failed to create document");
    }
});
/**
 * Get a document by ID
 */
exports.getDocument = functions.https.onCall(async (request) => {
    // Verify authentication using shared helpers
    FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, documentId } = request.data;
    if (!collection || !documentId) {
        throw new Error("Collection and documentId are required");
    }
    try {
        // Use shared CRUD helpers
        const data = await FirestoreCrudHelpers.getDocument(collection, documentId);
        if (!data) {
            throw new Error("Document not found");
        }
        return {
            success: true,
            data
        };
    }
    catch (error) {
        logger.error("Error getting document:", error);
        throw new Error("Failed to get document");
    }
});
/**
 * Update a document
 */
exports.updateDocument = functions.https.onCall(async (request) => {
    // Verify authentication using shared helpers
    FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, documentId, data } = request.data;
    if (!collection || !documentId || !data) {
        throw new Error("Collection, documentId, and data are required");
    }
    try {
        // Use shared CRUD helpers
        await FirestoreCrudHelpers.updateDocument(collection, documentId, data);
        logger.info(`Document updated in ${collection}: ${documentId}`);
        return { success: true };
    }
    catch (error) {
        logger.error("Error updating document:", error);
        throw new Error("Failed to update document");
    }
});
/**
 * Delete a document
 */
exports.deleteDocument = functions.https.onCall(async (request) => {
    // Verify authentication using shared helpers
    FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, documentId } = request.data;
    if (!collection || !documentId) {
        throw new Error("Collection and documentId are required");
    }
    try {
        // Use shared CRUD helpers
        await FirestoreCrudHelpers.deleteDocument(collection, documentId);
        logger.info(`Document deleted from ${collection}: ${documentId}`);
        return { success: true };
    }
    catch (error) {
        logger.error("Error deleting document:", error);
        throw new Error("Failed to delete document");
    }
});
/**
 * List documents with optional filtering and pagination
 */
exports.listDocuments = functions.https.onCall(async (request) => {
    // Verify authentication using shared helpers
    FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, filters, orderBy, limit = 50 } = request.data;
    if (!collection) {
        throw new Error("Collection is required");
    }
    try {
        // Use shared CRUD helpers
        const documents = await FirestoreCrudHelpers.queryDocuments(collection, {
            filters,
            orderBy,
            limit: Math.min(limit, 100) // Max 100 items
        });
        return {
            success: true,
            data: documents,
            count: documents.length
        };
    }
    catch (error) {
        logger.error("Error listing documents:", error);
        throw new Error("Failed to list documents");
    }
});
/**
 * Batch create multiple documents
 */
exports.batchCreateDocuments = functions.https.onCall(async (request) => {
    // Verify authentication using shared helpers
    const user = FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, documents } = request.data;
    if (!collection || !Array.isArray(documents)) {
        throw new Error("Collection and documents array are required");
    }
    if (documents.length > 500) {
        throw new Error("Maximum 500 documents per batch");
    }
    try {
        // Use shared CRUD helpers
        const results = await FirestoreCrudHelpers.batchCreate(collection, documents.map(doc => ({ data: doc })), user.uid);
        logger.info(`Batch created ${documents.length} documents in ${collection}`);
        return {
            success: true,
            data: results,
            count: results.length
        };
    }
    catch (error) {
        logger.error("Error batch creating documents:", error);
        throw new Error("Failed to batch create documents");
    }
});
/**
 * Batch update multiple documents
 */
exports.batchUpdateDocuments = functions.https.onCall(async (request) => {
    // Verify authentication using shared helpers
    FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, updates } = request.data;
    if (!collection || !Array.isArray(updates)) {
        throw new Error("Collection and updates array are required");
    }
    if (updates.length > 500) {
        throw new Error("Maximum 500 updates per batch");
    }
    try {
        // Use shared CRUD helpers
        await FirestoreCrudHelpers.batchUpdate(collection, updates);
        logger.info(`Batch updated ${updates.length} documents in ${collection}`);
        return {
            success: true,
            count: updates.length
        };
    }
    catch (error) {
        logger.error("Error batch updating documents:", error);
        throw new Error("Failed to batch update documents");
    }
});
//# sourceMappingURL=index.js.map