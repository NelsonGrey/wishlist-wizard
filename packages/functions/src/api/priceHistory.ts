import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';

const db = getFirestore();
const auth = getAuth();

/**
 * HTTP GET /api/items/:itemId/price-history
 * Requires Authorization: Bearer <idToken>
 * Returns an array of price history points: { date: string, price: number, store?: string }
 */
export const getItemPriceHistory = onRequest(async (req, res) => {
  try {
    // Only allow GET
    if (req.method !== 'GET') {
      res.status(405).send({ error: 'Method not allowed' });
      return;
    }

    // Parse itemId from path: expects /api/items/:itemId/price-history
    const requestUrl = (req.path || req.url || '');
    const match = requestUrl.match(/\/api\/items\/([^\/]+)\/price-history/);
    const itemId = match ? match[1] : req.query.itemId;

    if (!itemId) {
      res.status(400).send({ error: 'Missing itemId' });
      return;
    }

    // Verify Authorization header contains Firebase ID token
    const headers = req.headers || {};
    const authHeader = (headers['authorization'] as string) || (headers['Authorization'] as string);
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      res.status(401).send({ error: 'Missing Authorization header' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    let uid: string | null = null;
    try {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (err) {
      logger.warn('Invalid ID token for price history request', { err });
      res.status(401).send({ error: 'Invalid ID token' });
      return;
    }

    // Fetch wishlist item to get product URL
    const itemDoc = await db.collection('wishlistItems').doc(itemId.toString()).get();
    if (!itemDoc.exists) {
      res.status(404).send({ error: 'Item not found' });
      return;
    }

    const item = itemDoc.data() as any;

    // Ensure user has access to this wishlist item (owner or collaborator via wishlist)
    const wishlistDoc = await db.collection('wishlists').doc(item.wishlistId).get();
    if (!wishlistDoc.exists) {
      res.status(404).send({ error: 'Wishlist not found' });
      return;
    }

    const wishlist = wishlistDoc.data() as any;
    const hasAccess = Array.isArray(wishlist.collaborators) && wishlist.collaborators.includes(uid) || wishlist.isPublic;
    if (!hasAccess) {
      res.status(403).send({ error: 'Access denied' });
      return;
    }

    const productUrl = item.url || item.productUrl || item.productUrlRaw || null;

    // Query priceHistory by productUrl first; fallback to alertId match if provided
    let historyQuery;
    if (productUrl) {
      historyQuery = db.collection('priceHistory')
        .where('productUrl', '==', productUrl)
        .orderBy('timestamp', 'asc')
        .limit(500);
    } else if (item.priceAlertId) {
      historyQuery = db.collection('priceHistory')
        .where('alertId', '==', item.priceAlertId.toString())
        .orderBy('timestamp', 'asc')
        .limit(500);
    } else {
      res.status(200).send([]);
      return;
    }

    const snapshot = await historyQuery.get();
    const points = snapshot.docs.map(doc => {
      const d = doc.data() as any;
      return {
        date: d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : (d.timestamp ? new Date(d.timestamp).toISOString() : null),
        price: typeof d.newPrice === 'number' ? d.newPrice : parseFloat(d.newPrice || d.price || 0),
        store: d.store || null
      };
    }).filter(p => p.date && !isNaN(new Date(p.date).getTime()));

    res.status(200).send(points);
  } catch (error) {
    logger.error('Error in getItemPriceHistory', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});

export default { getItemPriceHistory };
