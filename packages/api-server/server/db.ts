// Stub database exports for memory storage mode
console.log('Using memory storage - database connections disabled');

// Create a stub db object to satisfy imports
// When services try to use db, they should handle memory storage appropriately
export const db = null as any; // Type assertion to avoid null checks in services
export const pool = null;
