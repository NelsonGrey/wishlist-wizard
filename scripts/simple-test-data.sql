
-- First, let's check what tables we have and create some basic test data

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

-- Add basic collaboration data if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'wishlist_collaborators'
  ) THEN
    -- Simple collaboration data
    INSERT INTO wishlist_collaborators (wishlist_id, user_id, role, last_active)
    VALUES 
      (3, 2, 'editor', NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Add notifications if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'notifications'
  ) THEN
    -- Simple notification data
    INSERT INTO notifications (user_id, type, title, content, is_read, action_url)
    VALUES 
      (1, 'wishlist_activity', 'New Collaboration', 'Alice added a comment to your "Home Decor Ideas" wishlist', false, '/wishlists/3')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
