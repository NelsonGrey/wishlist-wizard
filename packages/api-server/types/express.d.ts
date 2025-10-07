import { User } from '@wishlist-wizard/shared';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    authenticated?: boolean;
    lastActive?: Date;
  }
}