const { execSync } = require('child_process');

console.log('Creating test data for WishKeeper...');

// SQL to create test data
const testDataSQL = `
-- Clear existing test data (if any)
DELETE FROM price_alerts WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
DELETE FROM wishlist_items WHERE wishlist_id IN (SELECT id FROM wishlists WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%'));
DELETE FROM wishlist_collaborators WHERE wishlist_id IN (SELECT id FROM wishlists WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%'));
DELETE FROM wishlists WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
DELETE FROM beneficiaries WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '%test%');
DELETE FROM users WHERE email LIKE '%test%' AND id != 1;

-- We keep the test user with ID 1 that we already created

-- Create additional users
INSERT INTO users (username, email, password_hash, full_name, verified)
VALUES 
  ('alice', 'alice@test.com', '$2a$10$7JdqRMiDJPUjBGU0p0eDneiXHyQmldz8XmroWRhDiwJZnKxdA.J1G', 'Alice Johnson', true),
  ('bob', 'bob@test.com', '$2a$10$7JdqRMiDJPUjBGU0p0eDneiXHyQmldz8XmroWRhDiwJZnKxdA.J1G', 'Bob Smith', true),
  ('carol', 'carol@test.com', '$2a$10$7JdqRMiDJPUjBGU0p0eDneiXHyQmldz8XmroWRhDiwJZnKxdA.J1G', 'Carol Williams', true);

-- Create beneficiaries
INSERT INTO beneficiaries (name, owner_id, relationship, birthdate, notes)
VALUES 
  ('Emma Johnson', 2, 'Daughter', '2015-05-15', 'Loves art and dancing'),
  ('Michael Smith', 3, 'Son', '2012-08-10', 'Interested in science and sports'),
  ('Sarah Williams', 4, 'Niece', '2017-02-20', 'Big fan of animated movies'),
  ('James Johnson', 2, 'Son', '2013-11-05', 'Likes video games and reading');

-- Create wishlists
INSERT INTO wishlists (name, user_id, beneficiary_id, share_id, is_public, is_collaborative, occasion, occasion_date, description)
VALUES 
  ('Birthday Wishlist', 1, NULL, 'share-id-1', true, false, 'Birthday', '2025-07-15', 'My birthday wishlist for this year'),
  ('Christmas List', 1, NULL, 'share-id-2', false, false, 'Christmas', '2025-12-25', 'Gift ideas for Christmas'),
  ('Home Decor Ideas', 1, NULL, 'share-id-3', true, true, NULL, NULL, 'Things I want for our new home'),
  
  ('Emma''s Birthday', 2, 1, 'share-id-4', true, true, 'Birthday', '2025-05-15', 'Emma''s 10th birthday wishlist'),
  ('James''s Christmas', 2, 4, 'share-id-5', true, false, 'Christmas', '2025-12-25', 'Christmas gifts for James'),
  
  ('Michael''s Graduation', 3, 2, 'share-id-6', true, true, 'Graduation', '2025-06-20', 'Gifts for Michael''s middle school graduation'),
  
  ('Sarah''s Birthday', 4, 3, 'share-id-7', false, false, 'Birthday', '2025-02-20', 'Sarah''s 8th birthday wishlist');

-- Create wishlist items
INSERT INTO wishlist_items (wishlist_id, title, price, numeric_price, image_url, product_url, store, note, category, brand, availability)
VALUES 
  -- testuser's items
  (1, 'Sony WH-1000XM5 Wireless Headphones', '$349.99', 349.99, 'https://m.media-amazon.com/images/I/61+btxzpfDL._AC_SL1500_.jpg', 'https://www.amazon.com/Sony-WH-1000XM5-Canceling-Wireless-Headphones/dp/B09XS7JWHH/', 'Amazon', 'Black color preferred', 'Electronics', 'Sony', 'In Stock'),
  (1, 'Kindle Paperwhite', '$139.99', 139.99, 'https://m.media-amazon.com/images/I/61PnHlc0HCL._AC_SL1500_.jpg', 'https://www.amazon.com/Kindle-Paperwhite-16-adjustable-warmth/dp/B08KTZ8249/', 'Amazon', '16GB model', 'Electronics', 'Amazon', 'In Stock'),
  (1, 'Apple Watch Series 8', '$399.00', 399.00, 'https://m.media-amazon.com/images/I/71ulah9iIwL._AC_SL1500_.jpg', 'https://www.amazon.com/Apple-Watch-Cellular-Midnight-Aluminum/dp/B0BDKGJQPZ/', 'Apple Store', '45mm GPS + Cellular', 'Electronics', 'Apple', 'In Stock'),
  
  (2, 'The Legend of Zelda: Tears of the Kingdom', '$59.99', 59.99, 'https://m.media-amazon.com/images/I/81hgF4elOeL._SL1500_.jpg', 'https://www.amazon.com/Legend-Zelda-Tears-Kingdom-Nintendo-Switch/dp/B097B2YKXS/', 'Best Buy', '', 'Video Games', 'Nintendo', 'In Stock'),
  (2, 'Patagonia Better Sweater', '$149.00', 149.00, 'https://m.media-amazon.com/images/I/81Wip0rPmxL._AC_UX569_.jpg', 'https://www.amazon.com/Patagonia-Better-Sweater-Jacket-Medium/dp/B07WNTLTH3/', 'REI', 'Size Medium, Gray color', 'Clothing', 'Patagonia', 'In Stock'),
  (2, 'Le Creuset Dutch Oven', '$369.95', 369.95, 'https://m.media-amazon.com/images/I/71TPx4w8-mL._AC_SL1500_.jpg', 'https://www.amazon.com/Creuset-Signature-Enameled-Cast-Iron-Round/dp/B01IIIIUPO/', 'Williams-Sonoma', '5.5 qt, Flame color', 'Kitchen', 'Le Creuset', 'In Stock'),
  
  (3, 'Dyson Air Purifier', '$549.99', 549.99, 'https://m.media-amazon.com/images/I/71z+TWoEGzL._AC_SL1500_.jpg', 'https://www.amazon.com/Dyson-Purifier-Formaldehyde-purifier-White/dp/B08YS2JBNM/', 'Dyson', 'For living room', 'Home', 'Dyson', 'In Stock'),
  (3, 'Philips Hue Starter Kit', '$169.99', 169.99, 'https://m.media-amazon.com/images/I/51Q5rsmuPwL._AC_SL1200_.jpg', 'https://www.amazon.com/Philips-Hue-Ambiance-Compatible-Assistant/dp/B07XJ7PQKS/', 'Amazon', 'For bedroom lighting', 'Smart Home', 'Philips', 'In Stock'),
  (3, 'Roomba Robot Vacuum', '$299.99', 299.99, 'https://m.media-amazon.com/images/I/717kKUFS5-L._AC_SL1500_.jpg', 'https://www.amazon.com/iRobot-Roomba-694-Connected-Carpets/dp/B094WLFVMZ/', 'Best Buy', '', 'Home', 'iRobot', 'In Stock'),
  
  -- alice's items
  (4, 'Lego Friends Set', '$69.99', 69.99, 'https://m.media-amazon.com/images/I/81+SxCX1i5L._AC_SL1500_.jpg', 'https://www.amazon.com/LEGO-Friends-Heartlake-Downtown-Building/dp/B0BBSMY6RK/', 'Target', 'She loves building things', 'Toys', 'LEGO', 'In Stock'),
  (4, 'Art Supply Set', '$34.95', 34.95, 'https://m.media-amazon.com/images/I/91FvHRbmAZL._AC_SL1500_.jpg', 'https://www.amazon.com/Art-Supply-Deluxe-Painting-Drawing/dp/B07CVHLVZ7/', 'Michaels', 'For her art classes', 'Arts & Crafts', 'Art 101', 'In Stock'),
  (4, 'Harry Potter Complete Book Set', '$59.99', 59.99, 'https://m.media-amazon.com/images/I/71rOzy4cyAL._AC_SL1000_.jpg', 'https://www.amazon.com/Harry-Potter-Paperback-Box-Set/dp/0545162076/', 'Barnes & Noble', 'She is starting to read chapter books', 'Books', 'Scholastic', 'In Stock'),
  
  (5, 'Nintendo Switch', '$299.99', 299.99, 'https://m.media-amazon.com/images/I/71K2Q0uABlL._SL1500_.jpg', 'https://www.amazon.com/Nintendo-Switch-Neon-Blue-Red-Joy%E2%80%91/dp/B07VGRJDFY/', 'GameStop', 'This is his main gift', 'Video Games', 'Nintendo', 'In Stock'),
  (5, 'Minecraft for Switch', '$29.99', 29.99, 'https://m.media-amazon.com/images/I/71i3JMu5ISL._SL1500_.jpg', 'https://www.amazon.com/Minecraft-Nintendo-Switch/dp/B07D13QGXM/', 'Amazon', 'His favorite game', 'Video Games', 'Mojang', 'In Stock'),
  
  -- bob's items
  (6, 'Telescope for Kids', '$89.99', 89.99, 'https://m.media-amazon.com/images/I/71zXYZwSShL._AC_SL1500_.jpg', 'https://www.amazon.com/Telescope-Astronomy-Beginners-Portable-Tripod/dp/B0B7RHFBW2/', 'Amazon', 'He loves astronomy', 'Science', 'Orion', 'In Stock'),
  (6, 'Basketball', '$29.99', 29.99, 'https://m.media-amazon.com/images/I/91vdgs5FY4L._AC_SL1500_.jpg', 'https://www.amazon.com/Spalding-NBA-Street-Basketball-29-5/dp/B0009KF4SE/', 'Dick\'s Sporting Goods', 'Outdoor basketball', 'Sports', 'Spalding', 'In Stock'),
  (6, 'Science Kit', '$49.99', 49.99, 'https://m.media-amazon.com/images/I/81NsXSuHi0L._AC_SL1500_.jpg', 'https://www.amazon.com/Thames-Kosmos-Chemistry-Science-Experiment/dp/B01BNSWGBY/', 'Toys R Us', 'Chemistry experiments kit', 'Science', 'Thames & Kosmos', 'In Stock'),
  
  -- carol's items
  (7, 'Frozen 2 Elsa Doll', '$24.99', 24.99, 'https://m.media-amazon.com/images/I/616J5q+d04L._AC_SL1500_.jpg', 'https://www.amazon.com/Disney-Frozen-Splash-Queen-Doll/dp/B083Z2F3JP/', 'Target', 'She loves Frozen', 'Toys', 'Disney', 'In Stock'),
  (7, 'Moana DVD', '$19.99', 19.99, 'https://m.media-amazon.com/images/I/91fqzaNQzVL._SL1500_.jpg', 'https://www.amazon.com/Moana-Dwayne-Johnson/dp/B01MRUN7SQ/', 'Walmart', 'Her favorite movie', 'Movies', 'Disney', 'In Stock'),
  (7, 'Kids Digital Camera', '$39.99', 39.99, 'https://m.media-amazon.com/images/I/71BajxTfvQL._AC_SL1500_.jpg', 'https://www.amazon.com/Camcorder-Selfie-Shockproof-Toddler-Camping/dp/B0BC9D1R8X/', 'Amazon', 'She likes taking pictures', 'Electronics', 'Prograce', 'In Stock');

-- Add collaborators to collaborative wishlists
INSERT INTO wishlist_collaborators (wishlist_id, user_id, role, last_active)
VALUES
  (3, 3, 'editor', NOW()), -- Bob is a collaborator on testuser's Home Decor list
  (3, 4, 'viewer', NOW()), -- Carol is a viewer on testuser's Home Decor list
  (4, 3, 'editor', NOW()), -- Bob is a collaborator on Emma's birthday list
  (4, 4, 'editor', NOW()), -- Carol is a collaborator on Emma's birthday list
  (6, 2, 'editor', NOW()); -- Alice is a collaborator on Michael's graduation list

-- Create price alerts
INSERT INTO price_alerts (user_id, item_id, target_price, triggered, expires_at)
VALUES
  (1, 1, 299.99, false, '2025-12-31'), -- Alert for Sony headphones
  (1, 6, 269.95, false, '2025-12-31'), -- Alert for Le Creuset Dutch Oven
  (2, 14, 249.99, false, '2025-12-31'), -- Alert for Nintendo Switch
  (3, 16, 79.99, false, '2025-12-31'); -- Alert for Telescope

-- Create notifications
INSERT INTO notifications (user_id, type, title, content, data, is_read, action_url)
VALUES
  (1, 'price_drop', 'Price Drop Alert', 'The price of "Kindle Paperwhite" dropped to $129.99', '{"itemId": 2, "oldPrice": 139.99, "newPrice": 129.99}', false, '/items/2'),
  (1, 'wishlist_activity', 'New Collaboration', 'Bob added a comment to your "Home Decor Ideas" wishlist', '{"wishlistId": 3, "userId": 3, "action": "comment"}', false, '/wishlists/3'),
  (2, 'item_reserved', 'Item Reserved', 'Bob reserved "Art Supply Set" from Emma''s Birthday wishlist', '{"itemId": 11, "userId": 3, "wishlistId": 4}', false, '/items/11'),
  (3, 'wishlist_shared', 'New Wishlist Shared', 'Alice shared "Emma''s Birthday" wishlist with you', '{"wishlistId": 4, "userId": 2}', true, '/wishlists/4'),
  (4, 'item_purchased', 'Item Purchased', 'Bob purchased "Frozen 2 Elsa Doll" from Sarah''s Birthday wishlist', '{"itemId": 19, "userId": 3, "wishlistId": 7}', false, '/items/19');
`;

try {
  // Write SQL to a file
  const fs = require('fs');
  const path = require('path');
  const sqlFilePath = path.join('scripts', 'test-data.sql');
  fs.writeFileSync(sqlFilePath, testDataSQL);
  
  // Execute the SQL file
  console.log('Inserting test data into database...');
  execSync(`psql $DATABASE_URL -f ${sqlFilePath}`);
  console.log('Test data created successfully!');
  
  // Summary of test data
  console.log('\nTEST DATA SUMMARY:');
  console.log('- 4 users (testuser, alice, bob, carol)');
  console.log('- 4 beneficiaries (children and relatives)');
  console.log('- 7 wishlists (mix of personal, collaborative, and for beneficiaries)');
  console.log('- 21 wishlist items across various categories');
  console.log('- 5 wishlist collaborators');
  console.log('- 4 price alerts');
  console.log('- 5 notifications of different types');
  console.log('\nAll users have the same password: "password123"');
} catch (error) {
  console.error('Error creating test data:');
  console.error(error.message);
  // Provide more details for debugging
  if (error.stderr) {
    console.error(error.stderr.toString());
  }
}