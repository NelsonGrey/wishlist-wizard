// Simple test harness that stubs firebase-admin Auth + Firestore
// and invokes the compiled getItemPriceHistory HTTP handler.

const path = require('path');

// --- Mock Auth ---
const mockAuth = {
  async verifyIdToken(token) {
    if (!token || token === 'bad') throw new Error('Invalid token');
    return { uid: 'test-uid' };
  },
};

// --- Mock Firestore ---
const makeMockDb = () => {
  return {
    collection(name) {
      if (name === 'wishlistItems') {
        return {
          doc(id) {
            return {
              async get() {
                return {
                  exists: true,
                  data() {
                    return { wishlistId: 'W1', productUrl: 'https://example.com/p/1' };
                  },
                };
              },
            };
          },
        };
      }

      if (name === 'wishlists') {
        return {
          doc(id) {
            return {
              async get() {
                return {
                  exists: true,
                  data() {
                    return { collaborators: ['test-uid'], isPublic: false };
                  },
                };
              },
            };
          },
        };
      }

      if (name === 'priceHistory') {
        // return a chainable query object: where(...).orderBy(...).limit(...).get()
        const docs = [
          {
            data() {
              return {
                timestamp: { toDate: () => new Date('2024-01-01T00:00:00Z') },
                newPrice: 19.99,
                store: 'ExampleStore',
              };
            },
          },
          {
            data() {
              return {
                timestamp: { toDate: () => new Date('2024-01-02T00:00:00Z') },
                newPrice: 17.49,
                store: 'ExampleStore',
              };
            },
          },
        ];

        const queryObj = {
          where() {
            return this;
          },
          orderBy() {
            return this;
          },
          limit() {
            return this;
          },
          async get() {
            return { docs };
          },
        };

        return queryObj;
      }

      // default stub
      return {
        doc() {
          return { async get() { return { exists: false }; } };
        },
      };
    },
  };
};

// --- Patch firebase-admin modules before requiring the compiled handler ---
const adminAuth = require('firebase-admin/auth');
const adminFirestore = require('firebase-admin/firestore');

adminAuth.getAuth = () => mockAuth;
adminFirestore.getFirestore = () => makeMockDb();

// Require the compiled function module
const priceHistoryModule = require(path.join(__dirname, '..', 'lib', 'api', 'priceHistory.js'));

if (!priceHistoryModule || !priceHistoryModule.getItemPriceHistory) {
  console.error('getItemPriceHistory not found in compiled module exports.');
  process.exit(1);
}

// Create mock request and response
const req = {
  method: 'GET',
  url: '/api/items/TESTITEM/price-history',
  path: '/api/items/TESTITEM/price-history',
  headers: { authorization: 'Bearer FAKE_TOKEN' },
  query: {},
};

const res = {
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    console.log('Response JSON:', JSON.stringify(payload, null, 2));
    return this;
  },
  send(payload) {
    this.body = payload;
    console.log('Response send:', payload);
    return this;
  },
};

async function run() {
  try {
    const handler = priceHistoryModule.getItemPriceHistory;
    // Invoke handler: it may be an express-style function
    const maybePromise = handler(req, res);
    if (maybePromise && typeof maybePromise.then === 'function') {
      await maybePromise;
    }
    console.log('Status:', res.statusCode);
  } catch (err) {
    console.error('Handler threw:', err && err.stack ? err.stack : err);
    process.exitCode = 2;
  }
}

run();
