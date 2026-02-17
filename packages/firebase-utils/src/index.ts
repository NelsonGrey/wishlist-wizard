// Shared Firebase utilities for Firebase-first architecture

// Client-side exports
export { FirebaseClient } from './client.js';
export type { FirebaseConfig } from './client.js';
export {
  AuthHelpers,
  FunctionsHelpers,
  StorageHelpers
} from './client.js';

// Server-side exports
export {
  FirestoreCrudHelpers,
  FunctionsAuthHelpers
} from './server.js';