import { Request, Response } from 'express';
import { calendarService } from '../services/calendarService';
import { storage } from '../storage';

/**
 * Get Google Calendar authorization URL
 */
export const getGoogleAuthUrl = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const authUrl = calendarService.getGoogleAuthUrl(userId);

    res.json({
      success: true,
      data: { authUrl }
    });
  } catch (error) {
    console.error('Error getting Google auth URL:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get Google auth URL'
    });
  }
};

/**
 * Get Outlook authorization URL
 */
export const getOutlookAuthUrl = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const authUrl = calendarService.getOutlookAuthUrl(userId);

    res.json({
      success: true,
      data: { authUrl }
    });
  } catch (error) {
    console.error('Error getting Outlook auth URL:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get Outlook auth URL'
    });
  }
};

/**
 * Handle Google Calendar OAuth callback
 */
export const handleGoogleCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state'
      });
    }

    const userId = parseInt(state as string);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user state'
      });
    }

    const integration = await calendarService.handleGoogleCallback(code as string, userId);

    // Auto-create events for the user
    await calendarService.autoCreateEventsForUser(userId, integration.id);

    res.json({
      success: true,
      data: integration,
      message: 'Google Calendar connected successfully!'
    });
  } catch (error) {
    console.error('Error handling Google callback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect Google Calendar'
    });
  }
};

/**
 * Handle Outlook OAuth callback
 */
export const handleOutlookCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state'
      });
    }

    const userId = parseInt(state as string);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user state'
      });
    }

    const integration = await calendarService.handleOutlookCallback(code as string, userId);

    // Auto-create events for the user
    await calendarService.autoCreateEventsForUser(userId, integration.id);

    res.json({
      success: true,
      data: integration,
      message: 'Outlook Calendar connected successfully!'
    });
  } catch (error) {
    console.error('Error handling Outlook callback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect Outlook Calendar'
    });
  }
};

/**
 * Get user's calendar integrations
 */
export const getUserCalendars = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const calendars = await calendarService.getUserCalendars(userId);

    res.json({
      success: true,
      data: calendars
    });
  } catch (error) {
    console.error('Error getting user calendars:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user calendars'
    });
  }
};

/**
 * Remove calendar integration
 */
export const removeCalendarIntegration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const calendarId = parseInt(id);

    if (isNaN(calendarId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid calendar ID'
      });
    }

    await calendarService.removeCalendarIntegration(userId, calendarId);

    res.json({
      success: true,
      message: 'Calendar integration removed successfully'
    });
  } catch (error) {
    console.error('Error removing calendar integration:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove calendar integration'
    });
  }
};

/**
 * Create a birthday event
 */
export const createBirthdayEvent = async (req: Request, res: Response) => {
  try {
    const { calendarId, beneficiaryId, date, reminderDays } = req.body;
    const userId = req.user!.id;

    if (!calendarId || !beneficiaryId || !date) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID, beneficiary ID, and date are required'
      });
    }

    // Get beneficiary details
    const beneficiary = await storage.getBeneficiary(beneficiaryId);
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        error: 'Beneficiary not found'
      });
    }

    // Verify beneficiary belongs to user
    if (beneficiary.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to beneficiary'
      });
    }

    const event = await calendarService.createOccasionEvent(userId, calendarId, {
      title: `🎂 ${beneficiary.name}'s Birthday`,
      date: new Date(date),
      beneficiaryId,
      eventType: 'birthday',
      recurrence: 'yearly',
      reminderDays: reminderDays || [30, 14, 7, 3, 1]
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Birthday event created successfully!'
    });
  } catch (error) {
    console.error('Error creating birthday event:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create birthday event'
    });
  }
};

/**
 * Create a wishlist deadline event
 */
export const createWishlistDeadlineEvent = async (req: Request, res: Response) => {
  try {
    const { calendarId, wishlistId, deadline } = req.body;
    const userId = req.user!.id;

    if (!calendarId || !wishlistId || !deadline) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID, wishlist ID, and deadline are required'
      });
    }

    // Get wishlist details
    const wishlist = await storage.getWishlistById(wishlistId);
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found'
      });
    }

    // Verify wishlist belongs to user or user is collaborator
    if (wishlist.userId !== userId) {
      const isCollaborator = await storage.isCollaborator(wishlistId, userId);
      if (!isCollaborator) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized access to wishlist'
        });
      }
    }

    const event = await calendarService.createWishlistDeadlineEvent(
      userId,
      calendarId,
      wishlist,
      new Date(deadline)
    );

    res.status(201).json({
      success: true,
      data: event,
      message: 'Wishlist deadline event created successfully!'
    });
  } catch (error) {
    console.error('Error creating wishlist deadline event:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create wishlist deadline event'
    });
  }
};

/**
 * Create a custom occasion event
 */
export const createCustomOccasionEvent = async (req: Request, res: Response) => {
  try {
    const { 
      calendarId, 
      title, 
      date, 
      eventType = 'custom',
      recurrence,
      reminderDays,
      beneficiaryId,
      wishlistId 
    } = req.body;
    const userId = req.user!.id;

    if (!calendarId || !title || !date) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID, title, and date are required'
      });
    }

    // Verify beneficiary if provided
    if (beneficiaryId) {
      const beneficiary = await storage.getBeneficiary(beneficiaryId);
      if (!beneficiary || beneficiary.ownerId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or unauthorized beneficiary'
        });
      }
    }

    // Verify wishlist if provided
    if (wishlistId) {
      const wishlist = await storage.getWishlistById(wishlistId);
      if (!wishlist) {
        return res.status(404).json({
          success: false,
          error: 'Wishlist not found'
        });
      }

      if (wishlist.userId !== userId) {
        const isCollaborator = await storage.isCollaborator(wishlistId, userId);
        if (!isCollaborator) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized access to wishlist'
          });
        }
      }
    }

    const event = await calendarService.createOccasionEvent(userId, calendarId, {
      title,
      date: new Date(date),
      beneficiaryId,
      wishlistId,
      eventType,
      recurrence,
      reminderDays: reminderDays || [7, 3, 1]
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Custom occasion event created successfully!'
    });
  } catch (error) {
    console.error('Error creating custom occasion event:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create custom occasion event'
    });
  }
};

/**
 * Sync calendar events
 */
export const syncCalendarEvents = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const calendarId = parseInt(id);

    if (isNaN(calendarId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid calendar ID'
      });
    }

    await calendarService.syncCalendarEvents(userId, calendarId);

    res.json({
      success: true,
      message: 'Calendar events synced successfully'
    });
  } catch (error) {
    console.error('Error syncing calendar events:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync calendar events'
    });
  }
};

/**
 * Auto-create events for user's existing data
 */
export const autoCreateEvents = async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.body;
    const userId = req.user!.id;

    if (!calendarId) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID is required'
      });
    }

    await calendarService.autoCreateEventsForUser(userId, calendarId);

    res.json({
      success: true,
      message: 'Events auto-created successfully for existing data'
    });
  } catch (error) {
    console.error('Error auto-creating events:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to auto-create events'
    });
  }
};