import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";

// Initialize PostgreSQL session store
const PgSession = ConnectPgSimple(session);

// Create the session store
const sessionStore = new PgSession({
  pool,
  tableName: "session", // Default session table name
  createTableIfMissing: true,
});

// Session configuration
export const sessionConfig = {
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "wishkeeper-secret-key",
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

// Create the session table (if it doesn't exist)
export const initializeSessionTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    console.log("Session table initialized");
  } catch (error) {
    console.error("Error initializing session table:", error);
  }
};