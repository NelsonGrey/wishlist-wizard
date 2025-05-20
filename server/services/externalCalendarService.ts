/**
 * External Calendar Service
 * 
 * This service handles the integration with external calendar providers like:
 * - Google Calendar
 * - Microsoft Outlook
 * - Apple Calendar
 * 
 * It provides methods for:
 * - OAuth authentication
 * - Fetching calendar events
 * - Creating events in external calendars
 * - Syncing events bidirectionally
 */

import { InsertCalendarEvent, InsertUserCalendar } from "@shared/schema";
import { CalendarIntegrationService } from "./calendarIntegrationService";
import { storage } from "../storage";

// External calendar providers
export enum CalendarProvider {
  GOOGLE = 'google',
  OUTLOOK = 'outlook',
  APPLE = 'apple',
  OTHER = 'other'
}

// Calendar connection status
export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  EXPIRED = 'expired',
  ERROR = 'error'
}

// External calendar event structure
export interface ExternalCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  recurrence?: string[];
  [key: string]: any;
}

/**
 * External Calendar Service Class
 */
export class ExternalCalendarService {
  private calendarService: CalendarIntegrationService;
  
  constructor() {
    this.calendarService = new CalendarIntegrationService(storage);
  }
  
  /**
   * Generate OAuth URL for a specific provider
   */
  getAuthUrl(provider: CalendarProvider, userId: number, redirectUrl: string): string {
    switch (provider) {
      case CalendarProvider.GOOGLE:
        return this.getGoogleAuthUrl(redirectUrl);
      case CalendarProvider.OUTLOOK:
        return this.getOutlookAuthUrl(redirectUrl);
      case CalendarProvider.APPLE:
        return this.getAppleAuthUrl(redirectUrl);
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }
  }
  
  /**
   * Handle OAuth callback and create calendar connection
   */
  async handleOAuthCallback(
    provider: CalendarProvider, 
    code: string, 
    userId: number, 
    redirectUrl: string
  ): Promise<number | null> {
    try {
      // Get tokens and calendar information from the provider
      const tokenData = await this.exchangeCodeForTokens(provider, code, redirectUrl);
      if (!tokenData) return null;
      
      // Get calendar data from the provider
      const calendarData = await this.fetchCalendarData(provider, tokenData.accessToken);
      if (!calendarData) return null;
      
      // Create calendar connection in our database
      const calendarRecord: InsertUserCalendar = {
        userId,
        calendarType: provider,
        calendarId: calendarData.id,
        displayName: calendarData.name,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiry: tokenData.expiresAt ? new Date(tokenData.expiresAt) : undefined,
        settings: {
          syncEvents: true,
          syncDirection: 'bidirectional',
          defaultReminders: [7] // Default to 7 days
        }
      };
      
      // Create the calendar in our system
      return await this.calendarService.connectCalendar(calendarRecord);
    } catch (error) {
      console.error(`Error connecting ${provider} calendar:`, error);
      return null;
    }
  }
  
  /**
   * Sync events from external calendar to our system
   */
  async syncExternalEvents(calendarId: number): Promise<boolean> {
    try {
      // Get the calendar details from our database
      const calendar = await this.getCalendarDetails(calendarId);
      if (!calendar) return false;
      
      // Check if token is expired and refresh if needed
      if (this.isTokenExpired(calendar)) {
        const refreshed = await this.refreshToken(calendar);
        if (!refreshed) return false;
      }
      
      // Fetch events from external calendar
      const events = await this.fetchExternalEvents(
        calendar.calendarType as CalendarProvider,
        calendar.accessToken,
        calendar.calendarId
      );
      
      if (!events) return false;
      
      // Sync the events with our database
      return await this.calendarService.syncExternalCalendarChanges(calendarId, events);
    } catch (error) {
      console.error(`Error syncing external events:`, error);
      return false;
    }
  }
  
  /**
   * Push an event to external calendar
   */
  async pushEventToExternal(eventId: number): Promise<boolean> {
    try {
      // Get the event and associated calendar
      const event = await this.getEventDetails(eventId);
      if (!event || !event.calendarId) return false;
      
      const calendar = await this.getCalendarDetails(event.calendarId);
      if (!calendar) return false;
      
      // Check if token is expired and refresh if needed
      if (this.isTokenExpired(calendar)) {
        const refreshed = await this.refreshToken(calendar);
        if (!refreshed) return false;
      }
      
      // Format the event for the external calendar
      const externalEvent = this.formatEventForExternalCalendar(
        event,
        calendar.calendarType as CalendarProvider
      );
      
      // Create or update the event in the external calendar
      let externalEventId: string | null = null;
      
      if (event.externalEventId) {
        // Update existing event
        externalEventId = await this.updateExternalEvent(
          calendar.calendarType as CalendarProvider,
          calendar.accessToken,
          calendar.calendarId,
          event.externalEventId,
          externalEvent
        );
      } else {
        // Create new event
        externalEventId = await this.createExternalEvent(
          calendar.calendarType as CalendarProvider,
          calendar.accessToken,
          calendar.calendarId,
          externalEvent
        );
      }
      
      if (!externalEventId) return false;
      
      // Update our event with the external event ID
      if (!event.externalEventId) {
        await this.updateEventExternalId(eventId, externalEventId);
      }
      
      return true;
    } catch (error) {
      console.error(`Error pushing event to external calendar:`, error);
      return false;
    }
  }
  
  /**
   * Delete an event from external calendar
   */
  async deleteExternalEvent(eventId: number): Promise<boolean> {
    try {
      // Get the event and associated calendar
      const event = await this.getEventDetails(eventId);
      if (!event || !event.calendarId || !event.externalEventId) return false;
      
      const calendar = await this.getCalendarDetails(event.calendarId);
      if (!calendar) return false;
      
      // Check if token is expired and refresh if needed
      if (this.isTokenExpired(calendar)) {
        const refreshed = await this.refreshToken(calendar);
        if (!refreshed) return false;
      }
      
      // Delete the event from the external calendar
      return await this.deleteEventFromExternal(
        calendar.calendarType as CalendarProvider,
        calendar.accessToken,
        calendar.calendarId,
        event.externalEventId
      );
    } catch (error) {
      console.error(`Error deleting event from external calendar:`, error);
      return false;
    }
  }
  
  // ------------------------------------------------------------------------
  // Private helper methods for specific calendar providers
  // ------------------------------------------------------------------------
  
  /**
   * Check if a calendar's access token is expired
   */
  private isTokenExpired(calendar: any): boolean {
    if (!calendar.tokenExpiry) return false;
    
    const expiryDate = new Date(calendar.tokenExpiry);
    const now = new Date();
    
    // Consider token expired if less than 5 minutes remaining
    return expiryDate.getTime() - now.getTime() < 5 * 60 * 1000;
  }
  
  /**
   * Refresh an expired access token
   */
  private async refreshToken(calendar: any): Promise<boolean> {
    try {
      if (!calendar.refreshToken) return false;
      
      const provider = calendar.calendarType as CalendarProvider;
      let tokenData: any = null;
      
      switch (provider) {
        case CalendarProvider.GOOGLE:
          tokenData = await this.refreshGoogleToken(calendar.refreshToken);
          break;
        case CalendarProvider.OUTLOOK:
          tokenData = await this.refreshOutlookToken(calendar.refreshToken);
          break;
        case CalendarProvider.APPLE:
          tokenData = await this.refreshAppleToken(calendar.refreshToken);
          break;
        default:
          return false;
      }
      
      if (!tokenData) return false;
      
      // Update the calendar record with new token info
      await this.updateCalendarTokens(
        calendar.id,
        tokenData.accessToken,
        tokenData.refreshToken || calendar.refreshToken,
        tokenData.expiresAt
      );
      
      return true;
    } catch (error) {
      console.error(`Error refreshing token:`, error);
      return false;
    }
  }
  
  /**
   * Format an event for external calendar services
   */
  private formatEventForExternalCalendar(
    event: any,
    provider: CalendarProvider
  ): any {
    // Common format
    const formattedEvent: any = {
      summary: event.title,
      description: event.description || '',
      start: {},
      end: {},
      location: event.location || '',
    };

    // Add start and end times/dates
    if (event.isAllDay) {
      // For all-day events, use date format
      const startDate = new Date(event.startDate);
      const endDate = event.endDate ? new Date(event.endDate) : startDate;
      
      formattedEvent.start.date = startDate.toISOString().split('T')[0];
      formattedEvent.end.date = endDate.toISOString().split('T')[0];
    } else {
      // For timed events, use dateTime format
      formattedEvent.start.dateTime = new Date(event.startDate).toISOString();
      formattedEvent.end.dateTime = event.endDate 
        ? new Date(event.endDate).toISOString() 
        : new Date(new Date(event.startDate).getTime() + 3600000).toISOString(); // Default to 1 hour
    }
    
    // Add recurrence if applicable
    if (event.recurrence) {
      switch (event.recurrence) {
        case 'yearly':
          formattedEvent.recurrence = ['RRULE:FREQ=YEARLY'];
          break;
        case 'monthly':
          formattedEvent.recurrence = ['RRULE:FREQ=MONTHLY'];
          break;
        case 'weekly':
          formattedEvent.recurrence = ['RRULE:FREQ=WEEKLY'];
          break;
        case 'daily':
          formattedEvent.recurrence = ['RRULE:FREQ=DAILY'];
          break;
      }
    }
    
    // Add reminders if configured
    if (event.reminderDays && event.reminderDays > 0) {
      formattedEvent.reminders = {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: event.reminderDays * 24 * 60 },
          { method: 'popup', minutes: event.reminderDays * 24 * 60 }
        ]
      };
    }
    
    // Provider-specific formatting
    switch (provider) {
      case CalendarProvider.GOOGLE:
        // Google Calendar specific adaptations
        break;
      case CalendarProvider.OUTLOOK:
        // Outlook specific adaptations
        if (formattedEvent.reminders) {
          formattedEvent.reminderMinutesBeforeStart = event.reminderDays * 24 * 60;
          delete formattedEvent.reminders;
        }
        break;
      case CalendarProvider.APPLE:
        // Apple Calendar specific adaptations
        break;
    }
    
    return formattedEvent;
  }
  
  // ------------------------------------------------------------------------
  // Google Calendar specific methods
  // ------------------------------------------------------------------------
  
  private getGoogleAuthUrl(redirectUrl: string): string {
    // Replace with actual Google OAuth implementation
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
    
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  }
  
  private async refreshGoogleToken(refreshToken: string): Promise<any> {
    try {
      // Mock implementation - would need to use actual Google API
      const response = {
        accessToken: 'mock_new_access_token',
        expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hour from now
      };
      
      return response;
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      return null;
    }
  }
  
  private async fetchGoogleEvents(accessToken: string, calendarId: string): Promise<ExternalCalendarEvent[]> {
    try {
      // Mock implementation - would need to use actual Google Calendar API
      const mockEvents: ExternalCalendarEvent[] = [
        {
          id: 'google_event_1',
          summary: 'Team Meeting',
          description: 'Weekly team sync',
          start: {
            dateTime: new Date().toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: new Date(Date.now() + 3600000).toISOString(),
            timeZone: 'UTC'
          },
          location: 'Conference Room A'
        }
      ];
      
      return mockEvents;
    } catch (error) {
      console.error('Error fetching Google events:', error);
      return [];
    }
  }
  
  // ------------------------------------------------------------------------
  // Outlook Calendar specific methods
  // ------------------------------------------------------------------------
  
  private getOutlookAuthUrl(redirectUrl: string): string {
    // Replace with actual Microsoft OAuth implementation
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const scope = encodeURIComponent('Calendars.ReadWrite');
    
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=${scope}`;
  }
  
  private async refreshOutlookToken(refreshToken: string): Promise<any> {
    try {
      // Mock implementation - would need to use actual Microsoft API
      const response = {
        accessToken: 'mock_new_access_token',
        expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hour from now
      };
      
      return response;
    } catch (error) {
      console.error('Error refreshing Outlook token:', error);
      return null;
    }
  }
  
  private async fetchOutlookEvents(accessToken: string, calendarId: string): Promise<ExternalCalendarEvent[]> {
    try {
      // Mock implementation - would need to use actual Microsoft Graph API
      const mockEvents: ExternalCalendarEvent[] = [
        {
          id: 'outlook_event_1',
          summary: 'Client Call',
          description: 'Quarterly review call with client',
          start: {
            dateTime: new Date().toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: new Date(Date.now() + 3600000).toISOString(),
            timeZone: 'UTC'
          },
          location: 'Call Room B'
        }
      ];
      
      return mockEvents;
    } catch (error) {
      console.error('Error fetching Outlook events:', error);
      return [];
    }
  }
  
  // ------------------------------------------------------------------------
  // Apple Calendar specific methods
  // ------------------------------------------------------------------------
  
  private getAppleAuthUrl(redirectUrl: string): string {
    // Replace with actual Apple OAuth implementation
    // Note: Apple Calendar uses a different auth flow through their app
    return `https://example.com/mock-apple-auth?redirect_uri=${encodeURIComponent(redirectUrl)}`;
  }
  
  private async refreshAppleToken(refreshToken: string): Promise<any> {
    try {
      // Mock implementation
      const response = {
        accessToken: 'mock_new_access_token',
        expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hour from now
      };
      
      return response;
    } catch (error) {
      console.error('Error refreshing Apple token:', error);
      return null;
    }
  }
  
  // ------------------------------------------------------------------------
  // Generic calendar methods that would call the appropriate provider methods
  // ------------------------------------------------------------------------
  
  private async exchangeCodeForTokens(
    provider: CalendarProvider,
    code: string,
    redirectUrl: string
  ): Promise<any> {
    // Mock implementation - would call the appropriate provider method
    return {
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hour from now
    };
  }
  
  private async fetchCalendarData(
    provider: CalendarProvider,
    accessToken: string
  ): Promise<any> {
    // Mock implementation - would call the appropriate provider method
    return {
      id: 'mock_calendar_id',
      name: `${provider} Primary Calendar`
    };
  }
  
  private async fetchExternalEvents(
    provider: CalendarProvider,
    accessToken: string,
    calendarId: string
  ): Promise<ExternalCalendarEvent[]> {
    switch (provider) {
      case CalendarProvider.GOOGLE:
        return this.fetchGoogleEvents(accessToken, calendarId);
      case CalendarProvider.OUTLOOK:
        return this.fetchOutlookEvents(accessToken, calendarId);
      default:
        return [];
    }
  }
  
  private async createExternalEvent(
    provider: CalendarProvider,
    accessToken: string,
    calendarId: string,
    eventData: any
  ): Promise<string | null> {
    // Mock implementation - would call the appropriate provider method
    return `mock_${provider}_event_id_${Date.now()}`;
  }
  
  private async updateExternalEvent(
    provider: CalendarProvider,
    accessToken: string,
    calendarId: string,
    eventId: string,
    eventData: any
  ): Promise<string | null> {
    // Mock implementation - would call the appropriate provider method
    return eventId;
  }
  
  private async deleteEventFromExternal(
    provider: CalendarProvider,
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<boolean> {
    // Mock implementation - would call the appropriate provider method
    return true;
  }
  
  // ------------------------------------------------------------------------
  // Database helper methods
  // ------------------------------------------------------------------------
  
  private async getCalendarDetails(calendarId: number): Promise<any> {
    // Mock implementation - would fetch from database
    return {
      id: calendarId,
      calendarType: 'google',
      calendarId: 'primary',
      displayName: 'Google Calendar',
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      tokenExpiry: new Date(Date.now() + 3600 * 1000)
    };
  }
  
  private async getEventDetails(eventId: number): Promise<any> {
    // Mock implementation - would fetch from database
    return {
      id: eventId,
      calendarId: 1,
      title: 'Test Event',
      description: 'This is a test event',
      startDate: new Date(),
      endDate: new Date(Date.now() + 3600000),
      isAllDay: false,
      externalEventId: null
    };
  }
  
  private async updateCalendarTokens(
    calendarId: number,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date
  ): Promise<boolean> {
    // Mock implementation - would update database
    return true;
  }
  
  private async updateEventExternalId(
    eventId: number,
    externalEventId: string
  ): Promise<boolean> {
    // Mock implementation - would update database
    return true;
  }
}

// Create a singleton instance
export const externalCalendarService = new ExternalCalendarService();