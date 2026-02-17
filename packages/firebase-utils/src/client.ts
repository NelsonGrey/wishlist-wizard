// Firebase Client SDK Utilities
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator, serverTimestamp, FieldValue } from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Initialize Firebase app with singleton pattern
 */
export class FirebaseClient {
  private static instance: FirebaseClient;
  private _app: FirebaseApp;
  private _auth: Auth;
  private _firestore: Firestore;
  private _functions: Functions;
  private _storage: FirebaseStorage;

  private constructor(config: FirebaseConfig) {
    // Initialize Firebase app
    this._app = getApps().length === 0
      ? initializeApp(config)
      : getApps()[0];

    // Initialize services
    this._auth = getAuth(this._app);
    this._firestore = getFirestore(this._app);
    this._functions = getFunctions(this._app);
    this._storage = getStorage(this._app);
  }

  static initialize(config: FirebaseConfig): FirebaseClient {
    if (!FirebaseClient.instance) {
      FirebaseClient.instance = new FirebaseClient(config);
    }
    return FirebaseClient.instance;
  }

  static getInstance(): FirebaseClient {
    if (!FirebaseClient.instance) {
      throw new Error('Firebase not initialized. Call FirebaseClient.initialize() first.');
    }
    return FirebaseClient.instance;
  }

  // Getters for Firebase services
  get auth(): Auth {
    return this._auth;
  }

  get firestore(): Firestore {
    return this._firestore;
  }

  get functions(): Functions {
    return this._functions;
  }

  get storage(): FirebaseStorage {
    return this._storage;
  }

  get app(): FirebaseApp {
    return this._app;
  }

  /**
   * Connect to Firebase emulators in development
   */
  connectToEmulators(): void {
    if (process.env.NODE_ENV === 'development') {
      try {
        connectAuthEmulator(this._auth, "http://localhost:9099");
        connectFirestoreEmulator(this._firestore, 'localhost', 8080);
        connectFunctionsEmulator(this._functions, "localhost", 5001);
        connectStorageEmulator(this._storage, "localhost", 9199);
        console.log('🔗 Connected to Firebase emulators');
      } catch (error) {
        console.warn('⚠️  Could not connect to emulators:', error);
      }
    }
  }
}

/**
 * Authentication helpers
 */
export class AuthHelpers {
  static async getCurrentUser(auth: Auth) {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(
        (user) => {
          unsubscribe();
          resolve(user);
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );
    });
  }

  static async waitForAuth(auth: Auth): Promise<any> {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(
        (user) => {
          unsubscribe();
          resolve(user);
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Auth state timeout'));
      }, 10000);
    });
  }
}



/**
 * Functions helpers
 */
export class FunctionsHelpers {
  static async callFunction(functions: Functions, name: string, data?: any) {
    const { httpsCallable } = await import('firebase/functions');
    const callable = httpsCallable(functions, name);
    const result = await callable(data);
    return result.data;
  }
}

/**
 * Storage helpers
 */
export class StorageHelpers {
  static async uploadFile(storage: FirebaseStorage, path: string, file: File): Promise<string> {
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  static async deleteFile(storage: FirebaseStorage, path: string): Promise<void> {
    const { ref, deleteObject } = await import('firebase/storage');
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  }
}

