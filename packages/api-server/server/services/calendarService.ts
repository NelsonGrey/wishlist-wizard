import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { storage } from '../storage';
import { emailService } from './emailService';

// Types for calendar events and integrations
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  isAllDay: boolean;
  eventType: string;
  reminderDays?: number[];
  recurrence?: string;
  beneficiaryId?: number;
  wishlistId?: number;
  metadata?: any;
}

export interface CalendarIntegration {
  id: number;
  userId: number;
  calendarType: 'google' | 'apple' | 'outlook';
  calendarId: string;
  displayName: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  isActive: boolean;
  lastSyncedAt?: Date;
  settings: any;
}

export interface ReminderSettings {
  enabled: boolean;
  daysInAdvance: number[];
  includeWishlistItems: boolean;
  includePriceDrops: boolean;
  includeGroupGifts: boolean;
}

/**
 * Calendar Service for integrating with Google Calendar, Apple Calendar, and Outlook
 */
export class CalendarService {
  private googleAuth: any;
  private outlookAuth: any;
  private calendars: Map<number, CalendarIntegration> = new Map();
  private events: Map<string, CalendarEvent> = new Map();
  private nextId = 1;

  constructor() {
    this.initializeGoogleAuth();
    this.initializeOutlookAuth();
  }

  /**
   * Initialize Google Calendar authentication
   */
  private initializeGoogleAuth() {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.googleAuth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
      );
    } else {
      console.warn('Google Calendar credentials not found. Google integration will be disabled.');
    }
  }

  /**
   * Initialize Outlook/Microsoft Graph authentication
   */
  private initializeOutlookAuth() {
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      this.outlookAuth = {
        getAccessToken: async () => {
          // This will be implemented with proper OAuth flow
          return '';
        }
      };
    } else {
      this.outlookAuth = null;
      console.warn('Microsoft Graph credentials not found. Outlook integration will be disabled.');
    }
  }

  /**
   * Get Google Calendar authorization URL
   */
  getGoogleAuthUrl(userId: number): string {
    if (!this.googleAuth) {
      throw new Error('Google Calendar integration not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.googleAuth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId.toString(), // Pass user ID in state for callback
      prompt: 'consent'
    });
  }

  /**
   * Get Outlook authorization URL
   */
  getOutlookAuthUrl(userId: number): string {
    if (!process.env.MICROSOFT_CLIENT_ID) {
      throw new Error('Outlook integration not configured');
    }

    const scopes = [
      'https://graph.microsoft.com/calendars.readwrite',
      'https://graph.microsoft.com/calendars.readwrite.shared'
    ];

    const baseUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      response_type: 'code',
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/outlook/callback',
      scope: scopes.join(' '),
      state: userId.toString(),
      response_mode: 'query'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Handle Google Calendar OAuth callback
   */
  async handleGoogleCallback(code: string, userId: number): Promise<CalendarIntegration> {
    if (!this.googleAuth) {
      throw new Error('Google Calendar integration not configured');
    }

    try {
      const { tokens } = await this.googleAuth.getToken(code);
      this.googleAuth.setCredentials(tokens);

      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
      const calendarList = await calendar.calendarList.list();
      
      // Get primary calendar
      const primaryCalendar = calendarList.data.items?.find(cal => cal.primary) || calendarList.data.items?.[0];
      
      if (!primaryCalendar) {
        throw new Error('No calendar found');
      }

      const integration: CalendarIntegration = {
        id: this.nextId++,
        userId,
        calendarType: 'google',
        calendarId: primaryCalendar.id!,
        displayName: primaryCalendar.summary || 'Google Calendar',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        isActive: true,
        settings: {
          timeZone: primaryCalendar.timeZone,
          color: primaryCalendar.backgroundColor
        }
      };

      this.calendars.set(integration.id, integration);
      return integration;
    } catch (error) {
      console.error('Error handling Google callback:', error);
      throw new Error('Failed to connect Google Calendar');
    }
  }

  /**
   * Handle Outlook OAuth callback
   */
  async handleOutlookCallback(code: string, userId: number): Promise<CalendarIntegration> {
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      throw new Error('Outlook integration not configured');
    }

    try {
      // Exchange code for tokens
      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      const tokenData = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/outlook/callback'
      });

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenData
      });

      const tokens: any = await tokenResponse.json();
      
      if (!tokens.access_token) {
        throw new Error('Failed to get access token');
      }

      // Get calendar info
      const graphClient = Client.init({
        authProvider: async () => tokens.access_token
      } as any);

      const calendars = await graphClient.api('/me/calendars').get();
      const primaryCalendar = calendars.value.find((cal: any) => cal.isDefaultCalendar) || calendars.value[0];

      const integration: CalendarIntegration = {
        id: this.nextId++,
        userId,
        calendarType: 'outlook',
        calendarId: primaryCalendar.id,
        displayName: primaryCalendar.name || 'Outlook Calendar',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true,
        settings: {
          timeZone: primaryCalendar.timeZone,
          color: primaryCalendar.color
        }
      };

      this.calendars.set(integration.id, integration);
      return integration;
    } catch (error) {
      console.error('Error handling Outlook callback:', error);
      throw new Error('Failed to connect Outlook Calendar');
    }
  }

  /**
   * Create a calendar event for a birthday or special occasion
   */
  async createOccasionEvent(
    userId: number,
    calendarId: number,
    occasion: {
      title: string;
      date: Date;
      beneficiaryId?: number;
      wishlistId?: number;
      eventType: 'birthday' | 'anniversary' | 'holiday' | 'custom';
      recurrence?: 'yearly' | 'monthly';
      reminderDays?: number[];
    }
  ): Promise<CalendarEvent> {
    const integration = this.calendars.get(calendarId);
    if (!integration || integration.userId !== userId) {
      throw new Error('Calendar integration not found or unauthorized');
    }

    const event: CalendarEvent = {
      id: `occasion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: occasion.title,
      description: await this.generateEventDescription(occasion),
      startDate: occasion.date,
      isAllDay: true,
      eventType: occasion.eventType,
      reminderDays: occasion.reminderDays || [7, 3, 1],
      recurrence: occasion.recurrence,
      beneficiaryId: occasion.beneficiaryId,
      wishlistId: occasion.wishlistId,
      metadata: {
        createdBy: 'wishlist-wizard',
        occasionType: occasion.eventType
      }
    };

    // Create event in external calendar
    await this.createExternalEvent(integration, event);
    
    // Store locally
    this.events.set(event.id, event);

    // Schedule reminders
    if (occasion.reminderDays) {
      await this.scheduleReminders(userId, event, occasion.reminderDays);
    }

    return event;
  }

  /**
   * Create a wishlist deadline event
   */
  async createWishlistDeadlineEvent(
    userId: number,
    calendarId: number,
    wishlist: any,
    deadline: Date
  ): Promise<CalendarEvent> {
    const integration = this.calendars.get(calendarId);
    if (!integration || integration.userId !== userId) {
      throw new Error('Calendar integration not found or unauthorized');
    }

    const event: CalendarEvent = {
      id: `wishlist_deadline_${wishlist.id}_${Date.now()}`,
      title: `🎁 ${wishlist.name} - Gift Deadline`,
      description: `Deadline to purchase gifts from the "${wishlist.name}" wishlist.\n\nItems on this wishlist:\n${await this.getWishlistItemsSummary(wishlist.id)}`,
      startDate: deadline,
      isAllDay: true,
      eventType: 'wishlist_deadline',
      reminderDays: [14, 7, 3, 1],
      wishlistId: wishlist.id,
      metadata: {
        createdBy: 'wishlist-wizard',
        wishlistId: wishlist.id
      }
    };

    // Create event in external calendar
    await this.createExternalEvent(integration, event);
    
    // Store locally
    this.events.set(event.id, event);

    // Schedule reminders
    await this.scheduleReminders(userId, event, [14, 7, 3, 1]);

    return event;
  }

  /**
   * Create external calendar event based on integration type
   */
  private async createExternalEvent(integration: CalendarIntegration, event: CalendarEvent): Promise<void> {
    try {
      switch (integration.calendarType) {
        case 'google':
          await this.createGoogleEvent(integration, event);
          break;
        case 'outlook':
          await this.createOutlookEvent(integration, event);
          break;
        case 'apple':
          // Apple Calendar uses CalDAV - would need additional implementation
          console.log('Apple Calendar integration not yet implemented');
          break;
      }
    } catch (error) {
      console.error(`Error creating ${integration.calendarType} event:`, error);
      throw error;
    }
  }

  /**
   * Create Google Calendar event
   */
  private async createGoogleEvent(integration: CalendarIntegration, event: CalendarEvent): Promise<void> {
    if (!this.googleAuth) {
      throw new Error('Google Calendar not configured');
    }

    // Set credentials
    this.googleAuth.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });

    const googleEvent = {
      summary: event.title,
      description: event.description,
      start: event.isAllDay 
        ? { date: event.startDate.toISOString().split('T')[0] }
        : { dateTime: event.startDate.toISOString() },
      end: event.endDate 
        ? (event.isAllDay 
          ? { date: event.endDate.toISOString().split('T')[0] }
          : { dateTime: event.endDate.toISOString() })
        : (event.isAllDay 
          ? { date: event.startDate.toISOString().split('T')[0] }
          : { dateTime: new Date(event.startDate.getTime() + 60 * 60 * 1000).toISOString() }),
      recurrence: event.recurrence === 'yearly' ? ['RRULE:FREQ=YEARLY'] : undefined,
      reminders: {
        useDefault: false,
        overrides: event.reminderDays?.map(days => ({
          method: 'email',
          minutes: days * 24 * 60
        })) || []
      }
    };

    await calendar.events.insert({
      calendarId: integration.calendarId,
      requestBody: googleEvent
    });
  }

  /**
   * Create Outlook calendar event
   */
  private async createOutlookEvent(integration: CalendarIntegration, event: CalendarEvent): Promise<void> {
    const graphClient = Client.init({
      authProvider: async () => integration.accessToken!
    } as any);

    const outlookEvent = {
      subject: event.title,
      body: {
        contentType: 'text',
        content: event.description || ''
      },
      start: {
        dateTime: event.startDate.toISOString(),
        timeZone: integration.settings.timeZone || 'UTC'
      },
      end: {
        dateTime: (event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000)).toISOString(),
        timeZone: integration.settings.timeZone || 'UTC'
      },
      isAllDay: event.isAllDay,
      recurrence: event.recurrence === 'yearly' ? {
        pattern: {
          type: 'absoluteYearly',
          interval: 1,
          dayOfMonth: event.startDate.getDate(),
          month: event.startDate.getMonth() + 1
        },
        range: {
          type: 'noEnd',
          startDate: event.startDate.toISOString().split('T')[0]
        }
      } : undefined
    };

    await graphClient.api(`/me/calendars/${integration.calendarId}/events`).post(outlookEvent);
  }

  /**
   * Schedule reminder notifications
   */
  private async scheduleReminders(userId: number, event: CalendarEvent, reminderDays: number[]): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user?.email) return;

    for (const days of reminderDays) {
      const reminderDate = new Date(event.startDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Skip past reminders
      if (reminderDate <= new Date()) continue;

      // In a real implementation, you'd use a job scheduler like Bull or node-cron
      // For now, we'll just log the reminder schedule
      console.log(`Reminder scheduled for ${user.email} on ${reminderDate.toISOString()} (${days} days before ${event.title})`);
      
      // Store reminder info for later processing
      const reminder = {
        id: `reminder_${event.id}_${days}d`,
        userId,
        eventId: event.id,
        reminderDate,
        daysInAdvance: days,
        sent: false
      };

      // In production, store this in a job queue or database
      setTimeout(async () => {
        await this.sendEventReminder(user, event, days);
      }, reminderDate.getTime() - Date.now());
    }
  }

  /**
   * Send event reminder email
   */
  private async sendEventReminder(user: any, event: CalendarEvent, daysInAdvance: number): Promise<void> {
    try {
      let reminderContent = '';
      let actionUrl = '';

      if (event.eventType === 'birthday' && event.beneficiaryId) {
        const beneficiary = await storage.getBeneficiary(event.beneficiaryId);
        reminderContent = `${beneficiary?.name}'s birthday is coming up in ${daysInAdvance} days!`;
        
        if (event.wishlistId) {
          actionUrl = `/wishlists/${event.wishlistId}`;
          reminderContent += ` Check out their wishlist for gift ideas.`;
        }
      } else if (event.eventType === 'wishlist_deadline') {
        reminderContent = `The deadline for "${event.title}" is in ${daysInAdvance} days. Don't forget to purchase your gifts!`;
        actionUrl = event.wishlistId ? `/wishlists/${event.wishlistId}` : '';
      } else {
        reminderContent = `Reminder: "${event.title}" is coming up in ${daysInAdvance} days.`;
      }

      // Use existing email service for consistent formatting
      await emailService.sendWishlistActivityNotification(
        user.email,
        'Upcoming Event Reminder',
        user.displayName || user.username,
        event.title,
        actionUrl || '/dashboard'
      );
    } catch (error) {
      console.error('Error sending event reminder:', error);
    }
  }

  /**
   * Generate event description with wishlist context
   */
  private async generateEventDescription(occasion: any): Promise<string> {
    let description = `${occasion.title}\n\n`;

    if (occasion.beneficiaryId) {
      const beneficiary = await storage.getBeneficiary(occasion.beneficiaryId);
      if (beneficiary) {
        description += `For: ${beneficiary.name}\n`;
        if (beneficiary.relationship) {
          description += `Relationship: ${beneficiary.relationship}\n`;
        }
      }
    }

    if (occasion.wishlistId) {
      description += `\n🎁 View wishlist for gift ideas: /wishlists/${occasion.wishlistId}\n`;
    }

    description += '\n---\nCreated by Wishlist Wizard';
    return description;
  }

  /**
   * Get wishlist items summary for event description
   */
  private async getWishlistItemsSummary(wishlistId: number): Promise<string> {
    try {
      const items = await storage.getWishlistItems(wishlistId);
      if (!items || items.length === 0) {
        return 'No items in wishlist yet.';
      }

      return items.slice(0, 5).map((item, index) => 
        `${index + 1}. ${item.title} - ${item.price}`
      ).join('\n') + (items.length > 5 ? `\n... and ${items.length - 5} more items` : '');
    } catch (error) {
      return 'Unable to load wishlist items.';
    }
  }

  /**
   * Get user's calendar integrations
   */
  async getUserCalendars(userId: number): Promise<CalendarIntegration[]> {
    return Array.from(this.calendars.values()).filter(cal => cal.userId === userId);
  }

  /**
   * Remove calendar integration
   */
  async removeCalendarIntegration(userId: number, calendarId: number): Promise<void> {
    const integration = this.calendars.get(calendarId);
    if (!integration || integration.userId !== userId) {
      throw new Error('Calendar integration not found or unauthorized');
    }

    this.calendars.delete(calendarId);
    
    // Remove associated events
    for (const [eventId, event] of this.events.entries()) {
      if (event.metadata?.calendarIntegrationId === calendarId) {
        this.events.delete(eventId);
      }
    }
  }

  /**
   * Sync events with external calendar
   */
  async syncCalendarEvents(userId: number, calendarId: number): Promise<void> {
    const integration = this.calendars.get(calendarId);
    if (!integration || integration.userId !== userId) {
      throw new Error('Calendar integration not found or unauthorized');
    }

    try {
      switch (integration.calendarType) {
        case 'google':
          await this.syncGoogleEvents(integration);
          break;
        case 'outlook':
          await this.syncOutlookEvents(integration);
          break;
      }

      integration.lastSyncedAt = new Date();
    } catch (error) {
      console.error(`Error syncing ${integration.calendarType} events:`, error);
      throw error;
    }
  }

  /**
   * Sync Google Calendar events
   */
  private async syncGoogleEvents(integration: CalendarIntegration): Promise<void> {
    if (!this.googleAuth) return;

    this.googleAuth.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
    
    const response = await calendar.events.list({
      calendarId: integration.calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
      q: 'Wishlist Wizard' // Only sync our events
    });

    // Process events and update local storage
    if (response.data.items) {
      for (const googleEvent of response.data.items) {
        // Update local event storage
        console.log(`Synced Google event: ${googleEvent.summary}`);
      }
    }
  }

  /**
   * Sync Outlook events
   */
  private async syncOutlookEvents(integration: CalendarIntegration): Promise<void> {
    const graphClient = Client.init({
      authProvider: async () => integration.accessToken!
    } as any);

    const response = await graphClient
      .api(`/me/calendars/${integration.calendarId}/events`)
      .filter("contains(subject, 'Wishlist Wizard')")
      .get();

    // Process events and update local storage
    if (response.value) {
      for (const outlookEvent of response.value) {
        console.log(`Synced Outlook event: ${outlookEvent.subject}`);
      }
    }
  }

  /**
   * Auto-create events from existing wishlists and beneficiaries
   */
  async autoCreateEventsForUser(userId: number, calendarId: number): Promise<void> {
    const integration = this.calendars.get(calendarId);
    if (!integration || integration.userId !== userId) {
      throw new Error('Calendar integration not found or unauthorized');
    }

    try {
      // Get user's beneficiaries and create birthday events
      const beneficiaries = await storage.getBeneficiaries(userId);
      for (const beneficiary of beneficiaries) {
        if (beneficiary.birthdate) {
          const nextBirthday = new Date(beneficiary.birthdate);
          nextBirthday.setFullYear(new Date().getFullYear());
          
          // If birthday already passed this year, set for next year
          if (nextBirthday < new Date()) {
            nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
          }

          await this.createOccasionEvent(userId, calendarId, {
            title: `🎂 ${beneficiary.name}'s Birthday`,
            date: nextBirthday,
            beneficiaryId: beneficiary.id,
            eventType: 'birthday',
            recurrence: 'yearly',
            reminderDays: [30, 14, 7, 3, 1]
          });
        }
      }

      // Get wishlists with occasion dates
      const wishlists = await storage.getWishlists(userId);
      for (const wishlist of wishlists) {
        if (wishlist.occasionDate) {
          const occasionDate = new Date(wishlist.occasionDate);
          
          // Create deadline event (e.g., 1 week before occasion)
          const deadlineDate = new Date(occasionDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          if (deadlineDate > new Date()) {
            await this.createWishlistDeadlineEvent(userId, calendarId, wishlist, deadlineDate);
          }
        }
      }

      console.log(`Auto-created calendar events for user ${userId}`);
    } catch (error) {
      console.error('Error auto-creating events:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const calendarService = new CalendarService();