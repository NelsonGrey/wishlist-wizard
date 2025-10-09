import session from "express-session";
import MemoryStore from "memorystore";

// Initialize memory session store for development
const SessionMemoryStore = MemoryStore(session);

// Create the session store
const sessionStore = new SessionMemoryStore({
  checkPeriod: 86400000, // prune expired entries every 24h
});

// Session configuration
export const sessionConfig = {
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "wishlist-wizard-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  },
};

// Export middleware
export const sessionMiddleware = session(sessionConfig);

// Initialize session table (no-op for memory store)
export const initializeSessionTable = async () => {
  console.log("Using memory session store for development");
};