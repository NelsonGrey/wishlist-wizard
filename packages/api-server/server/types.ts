import 'express-session';

// Extend the Express session namespace with our custom properties
declare module 'express-session' {
  interface Session {
    userId?: number;
  }
}