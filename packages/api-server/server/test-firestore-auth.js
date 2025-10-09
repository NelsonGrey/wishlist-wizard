import fetch from 'node-fetch';

async function testFirestoreAuth() {
  const baseUrl = 'http://localhost:3001';
  
  try {
    console.log('🧪 Testing Firestore Authentication...');
    
    // Test 1: Try to login with demo user
    console.log('\n1. Testing login with demo user...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'demo@example.com',
        password: 'password123'
      })
    });
    
    const loginResult = await loginResponse.json();
    console.log('Login response:', loginResult);
    
    if (loginResponse.ok) {
      console.log('✅ Login successful!');
      
      // Test 2: Get user wishlists
      console.log('\n2. Testing wishlist retrieval...');
      const token = loginResult.token;
      
      const wishlistsResponse = await fetch(`${baseUrl}/api/wishlists`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const wishlists = await wishlistsResponse.json();
      console.log('Wishlists response:', wishlists);
      
      if (wishlistsResponse.ok) {
        console.log('✅ Wishlists retrieved successfully!');
        console.log(`Found ${wishlists.length} wishlists`);
        
        if (wishlists.length > 0) {
          // Test 3: Get items from first wishlist
          console.log('\n3. Testing wishlist items retrieval...');
          const firstWishlistId = wishlists[0].id;
          
          const itemsResponse = await fetch(`${baseUrl}/api/wishlists/${firstWishlistId}/items`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          const items = await itemsResponse.json();
          console.log('Items response:', items);
          
          if (itemsResponse.ok) {
            console.log('✅ Wishlist items retrieved successfully!');
            console.log(`Found ${items.length} items in "${wishlists[0].name}"`);
          } else {
            console.log('❌ Failed to retrieve wishlist items');
          }
        }
      } else {
        console.log('❌ Failed to retrieve wishlists');
      }
    } else {
      console.log('❌ Login failed');
    }
    
    console.log('\n🎉 Firestore authentication test completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testFirestoreAuth();