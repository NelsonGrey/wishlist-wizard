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
exports.FunctionsAuthHelpers = exports.StorageHelpers = exports.FunctionsHelpers = exports.FirestoreCrudHelpers = exports.AuthHelpers = exports.FirebaseClient = void 0;
// Firebase Client SDK Utilities
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const functions_1 = require("firebase/functions");
const storage_1 = require("firebase/storage");
const admin = __importStar(require("firebase-admin"));
/**
 * Initialize Firebase app with singleton pattern
 */
class FirebaseClient {
    constructor(config) {
        // Initialize Firebase app
        this._app = (0, app_1.getApps)().length === 0
            ? (0, app_1.initializeApp)(config)
            : (0, app_1.getApps)()[0];
        // Initialize services
        this._auth = (0, auth_1.getAuth)(this._app);
        this._firestore = (0, firestore_1.getFirestore)(this._app);
        this._functions = (0, functions_1.getFunctions)(this._app);
        this._storage = (0, storage_1.getStorage)(this._app);
    }
    static initialize(config) {
        if (!FirebaseClient.instance) {
            FirebaseClient.instance = new FirebaseClient(config);
        }
        return FirebaseClient.instance;
    }
    static getInstance() {
        if (!FirebaseClient.instance) {
            throw new Error('Firebase not initialized. Call FirebaseClient.initialize() first.');
        }
        return FirebaseClient.instance;
    }
    // Getters for Firebase services
    get auth() {
        return this._auth;
    }
    get firestore() {
        return this._firestore;
    }
    get functions() {
        return this._functions;
    }
    get storage() {
        return this._storage;
    }
    get app() {
        return this._app;
    }
    /**
     * Connect to Firebase emulators in development
     */
    connectToEmulators() {
        if (process.env.NODE_ENV === 'development') {
            try {
                (0, auth_1.connectAuthEmulator)(this._auth, "http://localhost:9099");
                (0, firestore_1.connectFirestoreEmulator)(this._firestore, 'localhost', 8080);
                (0, functions_1.connectFunctionsEmulator)(this._functions, "localhost", 5001);
                (0, storage_1.connectStorageEmulator)(this._storage, "localhost", 9199);
                console.log('🔗 Connected to Firebase emulators');
            }
            catch (error) {
                console.warn('⚠️  Could not connect to emulators:', error);
            }
        }
    }
}
exports.FirebaseClient = FirebaseClient;
/**
 * Authentication helpers
 */
class AuthHelpers {
    static async getCurrentUser(auth) {
        return new Promise((resolve, reject) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            }, (error) => {
                unsubscribe();
                reject(error);
            });
        });
    }
    static async waitForAuth(auth) {
        return new Promise((resolve, reject) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            }, (error) => {
                unsubscribe();
                reject(error);
            });
            // Timeout after 10 seconds
            setTimeout(() => {
                unsubscribe();
                reject(new Error('Auth state timeout'));
            }, 10000);
        });
    }
}
exports.AuthHelpers = AuthHelpers;
/**
 * Firestore CRUD helpers for Firebase Functions
 */
class FirestoreCrudHelpers {
    static getDb() {
        // Initialize admin if not already done (safe for multiple imports)
        if (!admin.apps.length) {
            admin.initializeApp();
        }
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
        // Apply offset (startAfter)
        if (options === null || options === void 0 ? void 0 : options.offset) {
            // This is a simplified version - in practice you'd need a document reference
            // query = query.startAfter(options.offset);
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
    static async batchDelete(collection, documentIds) {
        const db = this.getDb();
        const batch = db.batch();
        for (const id of documentIds) {
            const docRef = db.collection(collection).doc(id);
            batch.delete(docRef);
        }
        await batch.commit();
    }
}
exports.FirestoreCrudHelpers = FirestoreCrudHelpers;
/**
 * Functions helpers
 */
class FunctionsHelpers {
    static async callFunction(functions, name, data) {
        const { httpsCallable } = await Promise.resolve().then(() => __importStar(require('firebase/functions')));
        const callable = httpsCallable(functions, name);
        const result = await callable(data);
        return result.data;
    }
}
exports.FunctionsHelpers = FunctionsHelpers;
/**
 * Storage helpers
 */
class StorageHelpers {
    static async uploadFile(storage, path, file) {
        const { ref, uploadBytes, getDownloadURL } = await Promise.resolve().then(() => __importStar(require('firebase/storage')));
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    }
    static async deleteFile(storage, path) {
        const { ref, deleteObject } = await Promise.resolve().then(() => __importStar(require('firebase/storage')));
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
    }
}
exports.StorageHelpers = StorageHelpers;
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
    /**
     * Check if user is authenticated without throwing
     */
    static isAuthenticated(context) {
        return !!context.auth;
    }
    /**
     * Get user ID if authenticated, null otherwise
     */
    static getUserId(context) {
        var _a;
        return ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || null;
    }
    /**
     * Get user email if authenticated, null otherwise
     */
    static getUserEmail(context) {
        var _a, _b;
        return ((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.email) || null;
    }
    /**
     * Verify user has specific custom claims
     */
    static verifyCustomClaims(context, requiredClaims) {
        const user = this.verifyAuthenticated(context);
        for (const [key, value] of Object.entries(requiredClaims)) {
            if (user.token[key] !== value) {
                const { HttpsError } = require('firebase-functions');
                throw new HttpsError('permission-denied', `Missing required claim: ${key}=${value}`);
            }
        }
    }
}
exports.FunctionsAuthHelpers = FunctionsAuthHelpers;
//# sourceMappingURL=client.js.map