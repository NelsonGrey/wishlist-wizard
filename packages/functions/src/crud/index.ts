import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { FunctionsAuthHelpers, FirestoreCrudHelpers } from "@shared/firebase-utils";

export interface CrudOptions {
  collection: string;
  documentId?: string;
  data?: any;
  filters?: Array<{ field: string; operator: FirebaseFirestore.WhereFilterOp; value: any }>;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

/**
 * Create a new document in a collection
 */
export const createDocument = onCall(async (request) => {
  // Verify authentication using shared helpers
  const user = FunctionsAuthHelpers.verifyAuthenticated(request);
  const { collection, data } = request.data as CrudOptions;

  if (!collection || !data) {
    throw new Error("Collection and data are required");
  }

  try {
    // Use shared CRUD helpers
    const result = await FirestoreCrudHelpers.createDocument(collection, data, user.uid);

    logger.info(`Document created in ${collection}: ${result.id}`);
    return {
      success: true,
      ...result
    };
  } catch (error) {
    logger.error("Error creating document:", error);
    throw new Error("Failed to create document");
  }
});

/**
 * Get a document by ID
 */
export const getDocument = onCall(async (request) => {
  // Verify authentication using shared helpers
  FunctionsAuthHelpers.verifyAuthenticated(request);
  const { collection, documentId } = request.data as CrudOptions;

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
  } catch (error) {
    logger.error("Error getting document:", error);
    throw new Error("Failed to get document");
  }
});

/**
 * Update a document
 */
export const updateDocument = onCall(async (request) => {
  // Verify authentication using shared helpers
  FunctionsAuthHelpers.verifyAuthenticated(request);
  const { collection, documentId, data } = request.data as CrudOptions;

  if (!collection || !documentId || !data) {
    throw new Error("Collection, documentId, and data are required");
  }

  try {
    // Use shared CRUD helpers
    await FirestoreCrudHelpers.updateDocument(collection, documentId, data);

    logger.info(`Document updated in ${collection}: ${documentId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error updating document:", error);
    throw new Error("Failed to update document");
  }
});

/**
 * Delete a document
 */
export const deleteDocument = onCall(async (request) => {
  // Verify authentication using shared helpers
  FunctionsAuthHelpers.verifyAuthenticated(request);
  const { collection, documentId } = request.data as CrudOptions;

  if (!collection || !documentId) {
    throw new Error("Collection and documentId are required");
  }

  try {
    // Use shared CRUD helpers
    await FirestoreCrudHelpers.deleteDocument(collection, documentId);

    logger.info(`Document deleted from ${collection}: ${documentId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error deleting document:", error);
    throw new Error("Failed to delete document");
  }
});

/**
 * List documents with optional filtering and pagination
 */
export const listDocuments = onCall(async (request) => {
  // Verify authentication using shared helpers
  FunctionsAuthHelpers.verifyAuthenticated(request);
  const { collection, filters, orderBy, limit = 50 } = request.data as CrudOptions;

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
  } catch (error) {
    logger.error("Error listing documents:", error);
    throw new Error("Failed to list documents");
  }
});

/**
 * Batch create multiple documents
 */
export const batchCreateDocuments = onCall(async (request) => {
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
    const results = await FirestoreCrudHelpers.batchCreate(
      collection,
      documents.map(doc => ({ data: doc })),
      user.uid
    );

    logger.info(`Batch created ${documents.length} documents in ${collection}`);
    return {
      success: true,
      data: results,
      count: results.length
    };
  } catch (error) {
    logger.error("Error batch creating documents:", error);
    throw new Error("Failed to batch create documents");
  }
});

/**
 * Batch update multiple documents
 */
export const batchUpdateDocuments = onCall(async (request) => {
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
  } catch (error) {
    logger.error("Error batch updating documents:", error);
    throw new Error("Failed to batch update documents");
  }
});