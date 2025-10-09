/**
 * Calendar Connections Routes
 * 
 * These routes handle connecting to external calendar services:
 * - Google Calendar
 * - Microsoft Outlook
 * - Apple Calendar
 * 
 * They provide endpoints for authentication, sync, and management.
 */

import { Request, Response } from 'express';
import { verifyJWT } from '../middlewares/auth-middleware';
import { externalCalendarService, CalendarProvider } from '../services/externalCalendarService';
import { db } from '../db';
import { userCalendars, calendarEvents } from '@wishlist-wizard/shared';
import { eq, and } from 'drizzle-orm';

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

/**
 * Get OAuth URL for a specific calendar provider
 */
export async function getCalendarAuthUrl(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const provider = req.params.provider as CalendarProvider;
    if (!Object.values(CalendarProvider).includes(provider)) {
      return res.status(400).json({ error: 'Invalid calendar provider' });
    }
    
    // Base redirect URL to our callback endpoint
    const host = req.get('host') || '';
    const protocol = req.secure || (req.get('x-forwarded-proto') === 'https') ? 'https' : 'http';
    const redirectUrl = `${protocol}://${host}/api/calendar/auth/callback/${provider}`;
    
    // Get auth URL for the provider
    const authUrl = externalCalendarService.getAuthUrl(provider, userId, redirectUrl);
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Error getting calendar auth URL:', error);
    res.status(500).json({ error: 'Failed to get calendar authorization URL' });
  }
}

/**
 * Handle OAuth callback from calendar provider
 */
export async function handleCalendarCallback(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const provider = req.params.provider as CalendarProvider;
    if (!Object.values(CalendarProvider).includes(provider)) {
      return res.status(400).json({ error: 'Invalid calendar provider' });
    }
    
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }
    
    // Base redirect URL that matches the one we used for the auth request
    const host = req.get('host') || '';
    const protocol = req.secure || (req.get('x-forwarded-proto') === 'https') ? 'https' : 'http';
    const redirectUrl = `${protocol}://${host}/api/calendar/auth/callback/${provider}`;
    
    // Connect the calendar
    const calendarId = await externalCalendarService.handleOAuthCallback(
      provider, 
      code, 
      userId, 
      redirectUrl
    );
    
    if (!calendarId) {
      return res.status(500).json({ error: 'Failed to connect calendar' });
    }
    
    // Redirect to calendar page with success message
    res.redirect(`/calendar?connected=true&provider=${provider}`);
  } catch (error) {
    console.error('Error handling calendar callback:', error);
    res.status(500).json({ error: 'Failed to connect calendar' });
  }
}

/**
 * Get all connected calendars for a user
 */
export async function getConnectedCalendars(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const connectedCalendars = await db.select().from(userCalendars)
      .where(and(
        eq(userCalendars.userId, userId),
        eq(userCalendars.isActive, true)
      ));
    
    // Don't send the access and refresh tokens to the client
    const safeCalendars = connectedCalendars.map((calendar: any) => ({
      id: calendar.id,
      calendarType: calendar.calendarType,
      displayName: calendar.displayName,
      isActive: calendar.isActive,
      lastSyncedAt: calendar.lastSyncedAt,
      settings: calendar.settings
    }));
    
    res.json(safeCalendars);
  } catch (error) {
    console.error('Error getting connected calendars:', error);
    res.status(500).json({ error: 'Failed to get connected calendars' });
  }
}

/**
 * Disconnect a calendar
 */
export async function disconnectCalendar(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const calendarId = parseInt(req.params.id);
    if (isNaN(calendarId)) {
      return res.status(400).json({ error: 'Invalid calendar ID' });
    }
    
    // Verify calendar belongs to user
    const [calendar] = await db.select().from(userCalendars)
      .where(and(
        eq(userCalendars.id, calendarId),
        eq(userCalendars.userId, userId)
      ));
    
    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }
    
    // Deactivate the calendar instead of deleting
    await db.update(userCalendars)
      .set({ isActive: false })
      .where(eq(userCalendars.id, calendarId));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect calendar' });
  }
}

/**
 * Sync events with external calendar
 */
export async function syncCalendar(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const calendarId = parseInt(req.params.id);
    if (isNaN(calendarId)) {
      return res.status(400).json({ error: 'Invalid calendar ID' });
    }
    
    // Verify calendar belongs to user
    const [calendar] = await db.select().from(userCalendars)
      .where(and(
        eq(userCalendars.id, calendarId),
        eq(userCalendars.userId, userId)
      ));
    
    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }
    
    // Sync the calendar
    const success = await externalCalendarService.syncExternalEvents(calendarId);
    
    if (success) {
      // Update the last synced timestamp
      await db.update(userCalendars)
        .set({ lastSyncedAt: new Date() })
        .where(eq(userCalendars.id, calendarId));
      
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to sync calendar' });
    }
  } catch (error) {
    console.error('Error syncing calendar:', error);
    res.status(500).json({ error: 'Failed to sync calendar' });
  }
}

/**
 * Update calendar settings
 */
export async function updateCalendarSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const calendarId = parseInt(req.params.id);
    if (isNaN(calendarId)) {
      return res.status(400).json({ error: 'Invalid calendar ID' });
    }
    
    // Verify calendar belongs to user
    const [calendar] = await db.select().from(userCalendars)
      .where(and(
        eq(userCalendars.id, calendarId),
        eq(userCalendars.userId, userId)
      ));
    
    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }
    
    // Update settings
    const { settings } = req.body;
    
    await db.update(userCalendars)
      .set({ 
        settings: settings,
        updatedAt: new Date()
      })
      .where(eq(userCalendars.id, calendarId));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating calendar settings:', error);
    res.status(500).json({ error: 'Failed to update calendar settings' });
  }
}

/**
 * Push a specific event to external calendar
 */
export async function pushEventToExternal(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    // Verify event belongs to user
    const [event] = await db.select().from(calendarEvents)
      .where(and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.userId, userId)
      ));
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Push the event to the external calendar
    const success = await externalCalendarService.pushEventToExternal(eventId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to push event to external calendar' });
    }
  } catch (error) {
    console.error('Error pushing event to external calendar:', error);
    res.status(500).json({ error: 'Failed to push event to external calendar' });
  }
}

/**
 * Register all calendar connection routes
 */
export function registerCalendarConnectionRoutes(app: any) {
  // OAuth routes
  app.get('/api/calendar/auth/:provider', verifyJWT, getCalendarAuthUrl);
  app.get('/api/calendar/auth/callback/:provider', handleCalendarCallback);
  
  // Calendar management routes
  app.get('/api/calendar/connections', verifyJWT, getConnectedCalendars);
  app.delete('/api/calendar/connections/:id', verifyJWT, disconnectCalendar);
  app.post('/api/calendar/connections/:id/sync', verifyJWT, syncCalendar);
  app.patch('/api/calendar/connections/:id/settings', verifyJWT, updateCalendarSettings);
  
  // Event sync routes
  app.post('/api/calendar/events/:eventId/push', verifyJWT, pushEventToExternal);
}