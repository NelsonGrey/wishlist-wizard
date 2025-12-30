const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Creating test data for WishKeeper...');

// SQL to create test data
const testDataSQL = `
-- Add more test users
INSERT INTO users (username, email, password_hash, full_name, verified)
VALUES 
  ('alice', 'alice@test.com', '$2a$10$7JdqRMiDJPUjBGU0p0eDneiXHyQmldz8XmroWRhDiwJZnKxdA.J1G', 'Alice Johnson', true),
  ('bob', 'bob@test.com', '$2a$10$7JdqRMiDJPUjBGU0p0eDneiXHyQmldz8XmroWRhDiwJZnKxdA.J1G', 'Bob Smith', true)
ON CONFLICT (username) DO NOTHING;

-- Create wishlists for each user
INSERT INTO wishlists (name, user_id, share_id)
VALUES 
  ('Birthday Wishlist', 1, 'share-id-1'),
  ('Christmas List', 1, 'share-id-2'),
  ('Home Decor Ideas', 1, 'share-id-3'),
  ('Alice''s Wishlist', 2, 'share-id-4'),
  ('Bob''s Wishlist', 3, 'share-id-5')
ON CONFLICT DO NOTHING;

-- Check if the wishlist_items table has the expected structure
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wishlist_items' AND column_name = 'title'
  ) THEN
    -- Add wishlist items with the existing structure
    INSERT INTO wishlist_items (wishlist_id, title, price, image_url, product_url, store)
    VALUES 
      (1, 'Sony WH-1000XM5 Wireless Headphones', '$349.99', 'https://m.media-amazon.com/images/I/61+btxzpfDL._AC_SL1500_.jpg', 'https://www.amazon.com/Sony-WH-1000XM5-Canceling-Wireless-Headphones/dp/B09XS7JWHH/', 'Amazon'),
      (1, 'Kindle Paperwhite', '$139.99', 'https://m.media-amazon.com/images/I/61PnHlc0HCL._AC_SL1500_.jpg', 'https://www.amazon.com/Kindle-Paperwhite-16-adjustable-warmth/dp/B08KTZ8249/', 'Amazon'),
      (2, 'Apple Watch Series 8', '$399.00', 'https://m.media-amazon.com/images/I/71ulah9iIwL._AC_SL1500_.jpg', 'https://www.amazon.com/Apple-Watch-Cellular-Midnight-Aluminum/dp/B0BDKGJQPZ/', 'Apple Store'),
      (3, 'Dyson Air Purifier', '$549.99', 'https://m.media-amazon.com/images/I/71z+TWoEGzL._AC_SL1500_.jpg', 'https://www.amazon.com/Dyson-Purifier-Formaldehyde-purifier-White/dp/B08YS2JBNM/', 'Dyson'),
      (4, 'Lego Friends Set', '$69.99', 'https://m.media-amazon.com/images/I/81+SxCX1i5L._AC_SL1500_.jpg', 'https://www.amazon.com/LEGO-Friends-Heartlake-Downtown-Building/dp/B0BBSMY6RK/', 'Target'),
      (5, 'Basketball', '$29.99', 'https://m.media-amazon.com/images/I/91vdgs5FY4L._AC_SL1500_.jpg', 'https://www.amazon.com/Spalding-NBA-Street-Basketball-29/dp/B0009KF4SE/', 'Dick Sporting Goods')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Add session data if the session table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'session'
  ) THEN
    -- Simple session data (this is just a placeholder as real sessions are managed by the application)
    INSERT INTO session (sid, sess, expire)
    VALUES 
      ('test-session-1', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-05-21T00:00:00.000Z","secure":false,"httpOnly":true,"path":"/"},"userId":1}', '2025-05-21 00:00:00')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Add wishlist collaborators if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'wishlist_collaborators'
  ) THEN
    -- Check columns and insert appropriate data
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'wishlist_collaborators' AND column_name = 'last_activity'
    ) THEN
      INSERT INTO wishlist_collaborators (wishlist_id, user_id, role, last_activity)
      VALUES (3, 2, 'editor', NOW())
      ON CONFLICT DO NOTHING;
    ELSE
      -- Fallback with minimal required columns
      INSERT INTO wishlist_collaborators (wishlist_id, user_id, role)
      VALUES (3, 2, 'editor')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- Add notifications if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'notifications'
  ) THEN
    -- Check if the content column exists or if we need to use message
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'content'
    ) THEN
      INSERT INTO notifications (user_id, type, title, content, is_read, action_url)
      VALUES (1, 'wishlist_activity', 'New Collaboration', 'Alice added a comment to your "Home Decor Ideas" wishlist', false, '/wishlists/3')
      ON CONFLICT DO NOTHING;
    ELSE
      -- Use message column instead
      INSERT INTO notifications (user_id, type, title, message, is_read, action_url)
      VALUES (1, 'wishlist_activity', 'New Collaboration', 'Alice added a comment to your "Home Decor Ideas" wishlist', false, '/wishlists/3')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;
`;

try {
  // Write SQL to a file
  const sqlFilePath = path.join('scripts', 'final-test-data.sql');
  fs.writeFileSync(sqlFilePath, testDataSQL);
  
  // Execute the SQL file
  console.log('Inserting test data into database...');
  execSync(`psql $DATABASE_URL -f ${sqlFilePath}`);
  console.log('Test data created successfully!');
  
  // Summary of test data
  console.log('\nTEST DATA SUMMARY:');
  console.log('- 3 users (testuser, alice, bob)');
  console.log('- 5 wishlists (3 for testuser, 1 for alice, 1 for bob)');
  console.log('- 6 wishlist items across various categories');
  console.log('- 1 wishlist collaboration (alice as editor on testuser\'s Home Decor list)');
  console.log('- 1 notification for testuser');
  console.log('\nAll test users have the same password: "password123"');

  console.log('\nLOGIN CREDENTIALS:');
  console.log('Username: testuser');
  console.log('Email: test@example.com');
  console.log('Password: password123');
  console.log('\nUsername: alice');
  console.log('Email: alice@test.com');
  console.log('Password: password123');
  console.log('\nUsername: bob');
  console.log('Email: bob@test.com');
  console.log('Password: password123');
} catch (error) {
  console.error('Error creating test data:');
  console.error(error.message);
  // Provide more details for debugging
  if (error.stderr) {
    console.error(error.stderr.toString());
  }
}