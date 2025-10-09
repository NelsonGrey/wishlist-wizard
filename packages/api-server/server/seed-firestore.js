import { firestoreStorage } from './storage.firestore.js';

async function seedFirestore() {
  try {
    console.log('🌱 Seeding Firestore with sample data...');
    
    // Create a demo user
    const demoUser = await firestoreStorage.createUser({
      username: 'demo',
      email: 'demo@example.com',
      password: '$2a$10$8K1p/a0dL2LkqvC8aY/.XuVUlvKrHUz8L8vQnO1kJr7fH2JbXq0Ne', // hashed 'password123'
      displayName: 'Demo User',
      avatarUrl: null,
      role: 'user',
      emailVerified: false,
      active: true,
      twoFactorEnabled: false
    });
    
    console.log('✅ Created demo user:', demoUser.email);
    
    // Create sample wishlists
    const wishlists = [
      { name: 'Holiday Gifts 2024', userId: demoUser.id },
      { name: 'Home Office Setup', userId: demoUser.id },
      { name: 'Summer Reading List', userId: demoUser.id }
    ];
    
    const createdWishlists = [];
    for (const wishlistData of wishlists) {
      const wishlist = await firestoreStorage.createWishlist(wishlistData);
      createdWishlists.push(wishlist);
      console.log('✅ Created wishlist:', wishlist.name);
    }
    
    // Add sample items to the wishlists
    const items = [
      {
        wishlistId: createdWishlists[0].id,
        title: 'Sony WH-1000XM4 Wireless Noise-Cancelling Headphones',
        price: '$298.00',
        imageUrl: 'https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1500_.jpg',
        productUrl: 'https://www.amazon.com/Sony-WH-1000XM4-Canceling-Headphones-phone-call/dp/B0863TXGM3/',
        store: 'Amazon',
        note: 'Black color preferred'
      },
      {
        wishlistId: createdWishlists[1].id,
        title: 'Breville Barista Express Espresso Machine',
        price: '$699.95',
        imageUrl: 'https://m.media-amazon.com/images/I/71tVNhmDDWL._AC_SL1500_.jpg',
        productUrl: 'https://www.amazon.com/Breville-BES870XL-Barista-Express-Espresso/dp/B00CH9QWOU/',
        store: 'Target',
        note: 'Silver color preferred'
      },
      {
        wishlistId: createdWishlists[2].id,
        title: 'The Seven Husbands of Evelyn Hugo',
        price: '$15.99',
        imageUrl: 'https://m.media-amazon.com/images/I/71FTVIqC5sL._AC_UY218_.jpg',
        productUrl: 'https://www.amazon.com/Seven-Husbands-Evelyn-Hugo-Novel/dp/1501161938/',
        store: 'Amazon',
        note: 'Paperback preferred'
      }
    ];
    
    for (const itemData of items) {
      const item = await firestoreStorage.createWishlistItem(itemData);
      console.log('✅ Created item:', item.title);
    }
    
    console.log('🎉 Firestore seeding completed successfully!');
    console.log(`Demo user credentials: demo@example.com / password123`);
    
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
  }
}

// Run the seed function
seedFirestore();