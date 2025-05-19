import { Request, Response } from 'express';
import { db } from '../db';
import { calendarEvents, insertCalendarEventSchema } from '../../shared/schema';
import { isAuthenticated } from '../auth';
import { eq, and, gte } from 'drizzle-orm';
import { addDays } from 'date-fns';

/**
 * Get all calendar events for the authenticated user
 */
export async function getEvents(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const events = await db.select().from(calendarEvents)
      .where(eq(calendarEvents.userId, userId));

    res.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
}

/**
 * Get a single calendar event by ID
 */
export async function getEventById(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const [event] = await db.select().from(calendarEvents)
      .where(and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.userId, userId)
      ));

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    res.status(500).json({ error: 'Failed to fetch calendar event' });
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const eventData = insertCalendarEventSchema.parse({
      ...req.body,
      userId
    });

    const [newEvent] = await db.insert(calendarEvents)
      .values(eventData)
      .returning();

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Check if event exists and belongs to user
    const [existingEvent] = await db.select().from(calendarEvents)
      .where(and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.userId, userId)
      ));

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update only the fields that are provided in the request
    const updateData = { ...req.body, updatedAt: new Date() };
    
    const [updatedEvent] = await db.update(calendarEvents)
      .set(updateData)
      .where(and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.userId, userId)
      ))
      .returning();

    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Check if event exists and belongs to user
    const [existingEvent] = await db.select().from(calendarEvents)
      .where(and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.userId, userId)
      ));

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Delete the event
    await db.delete(calendarEvents)
      .where(and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.userId, userId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
}

/**
 * Get upcoming events (next 30 days)
 */
export async function getUpcomingEvents(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const today = new Date();
    const thirtyDaysLater = addDays(today, 30);

    const events = await db.select().from(calendarEvents)
      .where(and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.startDate, today)
      ));

    // Filter to only include events within the next 30 days
    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate <= thirtyDaysLater;
    });

    // Sort by date
    upcomingEvents.sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    res.json(upcomingEvents);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
}

/**
 * Dummy implementation for sync settings
 * In a real implementation, this would connect to external calendar providers
 */
export async function getSyncSettings(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Return empty sync settings since we're not implementing the full functionality
    res.json([]);
  } catch (error) {
    console.error('Error fetching calendar sync settings:', error);
    res.status(500).json({ error: 'Failed to fetch calendar sync settings' });
  }
}

/**
 * Dummy implementation for saving sync settings
 */
export async function saveSyncSettings(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Just return success since we're not implementing the full functionality
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving calendar sync settings:', error);
    res.status(500).json({ error: 'Failed to save calendar sync settings' });
  }
}

/**
 * Dummy implementation for syncing calendars
 */
export async function syncCalendars(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Just return success since we're not implementing the full functionality
    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing calendars:', error);
    res.status(500).json({ error: 'Failed to sync calendars' });
  }
}

/**
 * Register all calendar routes
 */
export function registerCalendarRoutes(app: any) {
  app.get('/api/calendar/events', isAuthenticated, getEvents);
  app.get('/api/calendar/events/upcoming', isAuthenticated, getUpcomingEvents);
  app.get('/api/calendar/events/:id', isAuthenticated, getEventById);
  app.post('/api/calendar/events', isAuthenticated, createEvent);
  app.patch('/api/calendar/events/:id', isAuthenticated, updateEvent);
  app.delete('/api/calendar/events/:id', isAuthenticated, deleteEvent);
  
  // Calendar sync routes (stub implementations)
  app.get('/api/calendar/sync-settings', isAuthenticated, getSyncSettings);
  app.post('/api/calendar/sync-settings', isAuthenticated, saveSyncSettings);
  app.post('/api/calendar/sync', isAuthenticated, syncCalendars);
}