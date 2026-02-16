import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin (safe for multiple imports)
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Authentication helpers for Firebase Functions
 */
class FunctionsAuthHelpers {
  /**
   * Verify user is authenticated and return user info
   * Throws HttpsError if not authenticated
   */
  static verifyAuthenticated(context: any): { uid: string; email?: string; token: any } {
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
  private static getDb() {
    return admin.firestore();
  }

  /**
   * Create a document with standard metadata
   */
  static async createDocument(
    collection: string,
    data: any,
    userId: string,
    options?: { id?: string; merge?: boolean }
  ): Promise<{ id: string; data: any }> {
    const db = this.getDb();
    const documentData = {
      ...data,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    let docRef: admin.firestore.DocumentReference;
    if (options?.id) {
      docRef = db.collection(collection).doc(options.id);
      if (options?.merge) {
        await docRef.set(documentData, { merge: true });
      } else {
        await docRef.set(documentData);
      }
    } else {
      docRef = await db.collection(collection).add(documentData);
    }

    return {
      id: docRef.id,
      data: { ...documentData, id: docRef.id }
    };
  }

  /**
   * Get a document by ID
   */
  static async getDocument(collection: string, documentId: string): Promise<any | null> {
    const db = this.getDb();
    const doc = await db.collection(collection).doc(documentId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Update a document
   */
  static async updateDocument(
    collection: string,
    documentId: string,
    data: any,
    options?: { merge?: boolean }
  ): Promise<void> {
    const db = this.getDb();
    const updateData = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (options?.merge) {
      await db.collection(collection).doc(documentId).set(updateData, { merge: true });
    } else {
      await db.collection(collection).doc(documentId).update(updateData);
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(collection: string, documentId: string): Promise<void> {
    const db = this.getDb();
    await db.collection(collection).doc(documentId).delete();
  }

  /**
   * Query documents with filters
   */
  static async queryDocuments(
    collection: string,
    options?: {
      filters?: Array<{ field: string; operator: admin.firestore.WhereFilterOp; value: any }>;
      orderBy?: { field: string; direction: 'asc' | 'desc' };
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    const db = this.getDb();
    let query: admin.firestore.Query = db.collection(collection);

    // Apply filters
    if (options?.filters) {
      options.filters.forEach(filter => {
        query = query.where(filter.field, filter.operator, filter.value);
      });
    }

    // Apply ordering
    if (options?.orderBy) {
      query = query.orderBy(options.orderBy.field, options.orderBy.direction);
    }

    // Apply limit
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Batch operations
   */
  static async batchCreate(
    collection: string,
    documents: Array<{ data: any; id?: string }>,
    userId: string
  ): Promise<Array<{ id: string; data: any }>> {
    const db = this.getDb();
    const batch = db.batch();
    const results = [];

    for (const doc of documents) {
      const documentData = {
        ...doc.data,
        createdBy: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      let docRef: admin.firestore.DocumentReference;
      if (doc.id) {
        docRef = db.collection(collection).doc(doc.id);
        batch.set(docRef, documentData);
      } else {
        docRef = db.collection(collection).doc();
        batch.set(docRef, documentData);
      }

      results.push({ id: docRef.id, data: { ...documentData, id: docRef.id } });
    }

    await batch.commit();
    return results;
  }

  static async batchUpdate(
    collection: string,
    updates: Array<{ id: string; data: any }>
  ): Promise<void> {
    const db = this.getDb();
    const batch = db.batch();

    for (const update of updates) {
      const updateData = {
        ...update.data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = db.collection(collection).doc(update.id);
      batch.update(docRef, updateData);
    }

    await batch.commit();
  }
}

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
export const createDocument = functions.https.onCall(async (request) => {
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
export const getDocument = functions.https.onCall(async (request) => {
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
export const updateDocument = functions.https.onCall(async (request) => {
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
export const deleteDocument = functions.https.onCall(async (request) => {
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
export const listDocuments = functions.https.onCall(async (request) => {
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
export const batchCreateDocuments = functions.https.onCall(async (request) => {
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
export const batchUpdateDocuments = functions.https.onCall(async (request) => {
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