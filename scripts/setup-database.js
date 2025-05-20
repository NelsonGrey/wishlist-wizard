import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the schema.sql file with all CREATE TABLE statements
console.log('Creating database schema for testing...');

const schemaContent = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE NOT NULL,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Beneficiaries table
CREATE TABLE IF NOT EXISTS beneficiaries (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(255),
  birthdate TIMESTAMP,
  preferences TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  beneficiary_id INTEGER REFERENCES beneficiaries(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  occasion VARCHAR(255),
  occasion_date TIMESTAMP,
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  share_id VARCHAR(255),
  cover_image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Wishlist Items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id SERIAL PRIMARY KEY,
  wishlist_id INTEGER NOT NULL REFERENCES wishlists(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  url TEXT,
  image_url TEXT,
  priority INTEGER DEFAULT 0 NOT NULL,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  reserved_by INTEGER REFERENCES users(id),
  purchased_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  store VARCHAR(255),
  product_id VARCHAR(255),
  quantity INTEGER DEFAULT 1 NOT NULL,
  notes TEXT
);

-- Wishlist Collaborators
CREATE TABLE IF NOT EXISTS wishlist_collaborators (
  id SERIAL PRIMARY KEY,
  wishlist_id INTEGER NOT NULL REFERENCES wishlists(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'viewer' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE (wishlist_id, user_id)
);

-- Price History
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES wishlist_items(id),
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  source VARCHAR(255),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Price Alerts
CREATE TABLE IF NOT EXISTS price_alerts (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES wishlist_items(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  target_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  trigger_count INTEGER DEFAULT 0 NOT NULL,
  last_triggered TIMESTAMP,
  notification_method VARCHAR(20) DEFAULT 'email' NOT NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  action_url TEXT,
  related_entity_type VARCHAR(50),
  related_entity_id INTEGER,
  email_sent BOOLEAN DEFAULT FALSE,
  email_status VARCHAR(50)
);

-- Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  beneficiary_id INTEGER REFERENCES beneficiaries(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  product_url TEXT,
  price DECIMAL(10, 2),
  store VARCHAR(255),
  category VARCHAR(255),
  confidence DECIMAL(3, 2),
  reasoning_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  source VARCHAR(50) DEFAULT 'ai' NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Group Gifts
CREATE TABLE IF NOT EXISTS group_gifts (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES wishlist_items(id),
  initiated_by_user_id INTEGER NOT NULL REFERENCES users(id),
  target_amount DECIMAL(10, 2) NOT NULL,
  current_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Group Gift Contributions
CREATE TABLE IF NOT EXISTS group_gift_contributions (
  id SERIAL PRIMARY KEY,
  group_gift_id INTEGER NOT NULL REFERENCES group_gifts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'completed' NOT NULL
);

-- Privacy Settings
CREATE TABLE IF NOT EXISTS privacy_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  visibility_level VARCHAR(20) DEFAULT 'public' NOT NULL,
  custom_access_list JSONB DEFAULT '[]'::jsonb,
  expiration_date TIMESTAMP,
  allow_comments BOOLEAN DEFAULT TRUE NOT NULL,
  allow_reservations BOOLEAN DEFAULT TRUE NOT NULL,
  require_approval BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- User Devices
CREATE TABLE IF NOT EXISTS user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  device_type VARCHAR(50) NOT NULL,
  device_token TEXT,
  device_name VARCHAR(255),
  os_type VARCHAR(50),
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  push_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  notification_settings JSONB DEFAULT '{}'::jsonb
);

-- Sync Logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  device_id INTEGER REFERENCES user_devices(id),
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'success' NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  entity_count INTEGER DEFAULT 0,
  duration_ms INTEGER
);

-- User Calendars
CREATE TABLE IF NOT EXISTS user_calendars (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  calendar_type VARCHAR(50) NOT NULL,
  calendar_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  external_calendar_id TEXT
);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  calendar_id INTEGER REFERENCES user_calendars(id),
  external_event_id TEXT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  location TEXT,
  is_all_day BOOLEAN DEFAULT FALSE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  reminder_days INTEGER,
  color VARCHAR(20) DEFAULT '#6366F1',
  recurrence VARCHAR(50),
  beneficiary_id INTEGER REFERENCES beneficiaries(id),
  wishlist_id INTEGER REFERENCES wishlists(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Session table (if not already created by the session middleware)
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
`;

// Write schema SQL to file
const schemaPath = path.join('scripts', 'schema.sql');
fs.writeFileSync(schemaPath, schemaContent);

try {
  // Execute SQL file against the database
  console.log('Executing SQL schema against database...');
  execSync(`psql $DATABASE_URL -f ${schemaPath}`);
  console.log('Database tables created successfully.');
} catch (error) {
  console.error('Error setting up database:');
  console.error(error.message);
  // Provide more details for debugging
  if (error.stderr) {
    console.error(error.stderr.toString());
  }
}