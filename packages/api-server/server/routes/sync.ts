import { Router, Request, Response } from 'express';
import { syncService } from '../services/syncService';
import { firebaseAuthMiddleware as isAuthenticated } from '../firebase-auth-simple';
import { WebSocket, WebSocketServer } from 'ws';

// Firebase-first authenticated request interface
interface AuthenticatedRequest extends Request {
  firebaseUser?: {
    uid: string;
    email?: string;
    displayName?: string;
    emailVerified: boolean;
  };
  userId?: number;
}

const syncRouter = Router();

// Real-time sync status endpoint
syncRouter.get("/status", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const stats = await syncService.getSyncStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Error getting sync status:", error);
    res.status(500).json({ error: "Failed to get sync status" });
  }
});

// Validate data integrity
syncRouter.get("/validate", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const validation = await syncService.validateDataIntegrity(userId);
    
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error("Error validating data integrity:", error);
    res.status(500).json({ error: "Failed to validate data integrity" });
  }
});

// Get incremental changes since timestamp
syncRouter.get("/changes", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const since = req.query.since ? new Date(req.query.since as string) : new Date(0);
    
    const changes = await syncService.getChangesSinceTimestamp(userId, since);
    
    res.json({
      success: true,
      changes,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error getting incremental changes:", error);
    res.status(500).json({ error: "Failed to get changes" });
  }
});

// Process offline actions (for batch sync)
syncRouter.post("/offline-actions", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { actions } = req.body;
    
    if (!Array.isArray(actions)) {
      return res.status(400).json({ error: "Actions must be an array" });
    }
    
    const results = await syncService.processOfflineActions(userId, actions);
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error("Error processing offline actions:", error);
    res.status(500).json({ error: "Failed to process offline actions" });
  }
});

// WebSocket connection handler for real-time sync
export function setupWebSocketSync(server: any) {
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws: WebSocket, req: Request) => {
    console.log('WebSocket connection established');
    
    // Handle authentication for WebSocket connections
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'auth') {
          // For simplicity, we'll assume the client sends a user ID
          // In production, you'd want proper JWT authentication
          const userId = data.userId;
          
          if (userId) {
            // Register this WebSocket connection for the user
            syncService.registerDevice(userId, Date.now()); // Using timestamp as device ID
            
            ws.send(JSON.stringify({
              type: 'auth_success',
              message: 'WebSocket authenticated'
            }));
          }
        }
        
        if (data.type === 'sync_request') {
          const userId = data.userId;
          const lastSync = data.lastSync ? new Date(data.lastSync) : new Date(0);
          
          const changes = await syncService.getChangesSinceTimestamp(userId, lastSync);
          
          ws.send(JSON.stringify({
            type: 'sync_data',
            changes,
            timestamp: new Date()
          }));
        }
        
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      // In production, you'd want to unregister the device
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Listen for sync events from the sync service
  syncService.on('sync_event', (data) => {
    // Broadcast to all connected WebSocket clients for the user
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'real_time_sync',
          event: data.event
        }));
      }
    });
  });
  
  return wss;
}

export default syncRouter;