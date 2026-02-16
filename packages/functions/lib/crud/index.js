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
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const shared_1 = require("../shared");
/**
 * Create a new document in a collection
 */
exports.createDocument = (0, https_1.onCall)(async (request) => {
    // Verify authentication using shared helpers
    const user = shared_1.FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, data } = request.data;
    if (!collection || !data) {
        throw new Error("Collection and data are required");
    }
    try {
        // Use shared CRUD helpers
        const result = await shared_1.FirestoreCrudHelpers.createDocument(collection, data, user.uid);
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
exports.getDocument = (0, https_1.onCall)(async (request) => {
    // Verify authentication using shared helpers
    shared_1.FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, documentId } = request.data;
    if (!collection || !documentId) {
        throw new Error("Collection and documentId are required");
    }
    try {
        // Use shared CRUD helpers
        const data = await shared_1.FirestoreCrudHelpers.getDocument(collection, documentId);
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
exports.updateDocument = (0, https_1.onCall)(async (request) => {
    // Verify authentication using shared helpers
    shared_1.FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, documentId, data } = request.data;
    if (!collection || !documentId || !data) {
        throw new Error("Collection, documentId, and data are required");
    }
    try {
        // Use shared CRUD helpers
        await shared_1.FirestoreCrudHelpers.updateDocument(collection, documentId, data);
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
exports.deleteDocument = (0, https_1.onCall)(async (request) => {
    // Verify authentication using shared helpers
    shared_1.FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, documentId } = request.data;
    if (!collection || !documentId) {
        throw new Error("Collection and documentId are required");
    }
    try {
        // Use shared CRUD helpers
        await shared_1.FirestoreCrudHelpers.deleteDocument(collection, documentId);
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
exports.listDocuments = (0, https_1.onCall)(async (request) => {
    // Verify authentication using shared helpers
    shared_1.FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, filters, orderBy, limit = 50 } = request.data;
    if (!collection) {
        throw new Error("Collection is required");
    }
    try {
        // Use shared CRUD helpers
        const documents = await shared_1.FirestoreCrudHelpers.queryDocuments(collection, {
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
exports.batchCreateDocuments = (0, https_1.onCall)(async (request) => {
    // Verify authentication using shared helpers
    const user = shared_1.FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, documents } = request.data;
    if (!collection || !Array.isArray(documents)) {
        throw new Error("Collection and documents array are required");
    }
    if (documents.length > 500) {
        throw new Error("Maximum 500 documents per batch");
    }
    try {
        // Use shared CRUD helpers
        const results = await shared_1.FirestoreCrudHelpers.batchCreate(collection, documents.map(doc => ({ data: doc })), user.uid);
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
exports.batchUpdateDocuments = (0, https_1.onCall)(async (request) => {
    // Verify authentication using shared helpers
    shared_1.FunctionsAuthHelpers.verifyAuthenticated(request);
    const { collection, updates } = request.data;
    if (!collection || !Array.isArray(updates)) {
        throw new Error("Collection and updates array are required");
    }
    if (updates.length > 500) {
        throw new Error("Maximum 500 updates per batch");
    }
    try {
        // Use shared CRUD helpers
        await shared_1.FirestoreCrudHelpers.batchUpdate(collection, updates);
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