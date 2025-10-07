import { db } from "../db";
import { 
  userCalendars,
  calendarEvents,
  wishlists,
  beneficiaries,
  notifications,
  InsertUserCalendar,
  InsertCalendarEvent,
  InsertNotification
} from "@wishlist-wizard/shared";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { IStorage } from "../storage";
import { addDays, format, parse, parseISO } from "date-fns";

export class CalendarIntegrationService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Connect a new calendar for a user
   */
  async connectCalendar(calendarData: InsertUserCalendar): Promise<number | null> {
    try {
      // Create the calendar connection
      const [newCalendar] = await db.insert(userCalendars)
        .values(calendarData)
        .returning({ id: userCalendars.id });
      
      // Sync existing wishlists and occasions to this calendar
      await this.initialCalendarSync(newCalendar.id);
      
      return newCalendar.id;
    } catch (error) {
      console.error("Error connecting calendar:", error);
      return null;
    }
  }

  /**
   * Perform initial sync of wishlist occasions to calendar
   */
  private async initialCalendarSync(calendarId: number): Promise<boolean> {
    try {
      // Get the calendar
      const calendar = await db.query.userCalendars.findFirst({
        where: eq(userCalendars.id, calendarId)
      });

      if (!calendar) return false;
      
      // Get all wishlists with occasion dates for this user
      const userWishlists = await db.query.wishlists.findMany({
        where: and(
          eq(wishlists.userId, calendar.userId),
          gte(wishlists.occasionDate, new Date())
        )
      });
      
      // Get all beneficiaries with birthdates for this user
      const userBeneficiaries = await db.query.beneficiaries.findMany({
        where: eq(beneficiaries.ownerId, calendar.userId)
      });
      
      // Create calendar events for wishlist occasions
      for (const wishlist of userWishlists) {
        if (wishlist.occasion && wishlist.occasionDate) {
          await this.createWishlistOccasionEvent(calendarId, wishlist);
        }
      }
      
      // Create calendar events for beneficiary birthdays
      for (const beneficiary of userBeneficiaries) {
        if (beneficiary.birthdate) {
          await this.createBirthdayEvent(calendarId, beneficiary);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error performing initial calendar sync:", error);
      return false;
    }
  }

  /**
   * Create a calendar event for a wishlist occasion
   */
  private async createWishlistOccasionEvent(calendarId: number, wishlist: any): Promise<number | null> {
    if (!wishlist.occasion || !wishlist.occasionDate) return null;
    
    try {
      // Create the event data
      const eventData: InsertCalendarEvent = {
        calendarId,
        title: `${wishlist.name} - ${wishlist.occasion}`,
        description: `Wishlist occasion: ${wishlist.description || wishlist.name}`,
        startDate: new Date(wishlist.occasionDate),
        endDate: new Date(wishlist.occasionDate),
        isAllDay: true,
        eventType: "wishlist_occasion",
        relatedEntityType: "wishlist",
        relatedEntityId: wishlist.id,
        reminderDays: 7, // Default reminder 7 days before
        recurrence: wishlist.occasion === "Birthday" || wishlist.occasion === "Anniversary" ? "yearly" : null
      };
      
      // Insert the event
      const [newEvent] = await db.insert(calendarEvents)
        .values(eventData)
        .returning({ id: calendarEvents.id });
      
      return newEvent.id;
    } catch (error) {
      console.error("Error creating wishlist occasion event:", error);
      return null;
    }
  }

  /**
   * Create a calendar event for a beneficiary's birthday
   */
  private async createBirthdayEvent(calendarId: number, beneficiary: any): Promise<number | null> {
    if (!beneficiary.birthdate) return null;
    
    try {
      // Calculate the next birthday from the birthdate
      const birthdate = new Date(beneficiary.birthdate);
      const today = new Date();
      const thisYearBirthday = new Date(today.getFullYear(), birthdate.getMonth(), birthdate.getDate());
      const nextBirthday = thisYearBirthday < today 
        ? new Date(today.getFullYear() + 1, birthdate.getMonth(), birthdate.getDate())
        : thisYearBirthday;
      
      // Create the event data
      const eventData: InsertCalendarEvent = {
        calendarId,
        title: `${beneficiary.name}'s Birthday`,
        description: `Birthday for ${beneficiary.name} (${beneficiary.relationship || 'beneficiary'})`,
        startDate: nextBirthday,
        endDate: nextBirthday,
        isAllDay: true,
        eventType: "birthday",
        relatedEntityType: "beneficiary",
        relatedEntityId: beneficiary.id,
        reminderDays: 14, // Default reminder 14 days before
        recurrence: "yearly"
      };
      
      // Insert the event
      const [newEvent] = await db.insert(calendarEvents)
        .values(eventData)
        .returning({ id: calendarEvents.id });
      
      return newEvent.id;
    } catch (error) {
      console.error("Error creating birthday event:", error);
      return null;
    }
  }

  /**
   * Synchronize external calendar changes with our system
   */
  async syncExternalCalendarChanges(calendarId: number, externalEvents: any[]): Promise<boolean> {
    try {
      // Get the calendar
      const calendar = await db.query.userCalendars.findFirst({
        where: eq(userCalendars.id, calendarId),
        with: {
          events: true
        }
      });

      if (!calendar) return false;
      
      // Map of existing events by externalEventId
      const existingEventMap = new Map();
      for (const event of calendar.events) {
        if (event.externalEventId) {
          existingEventMap.set(event.externalEventId, event);
        }
      }
      
      // Process each external event
      for (const extEvent of externalEvents) {
        const existingEvent = existingEventMap.get(extEvent.id);
        
        if (existingEvent) {
          // Update existing event
          await db.update(calendarEvents)
            .set({
              title: extEvent.summary || existingEvent.title,
              description: extEvent.description || existingEvent.description,
              startDate: new Date(extEvent.start.dateTime || extEvent.start.date),
              endDate: new Date(extEvent.end.dateTime || extEvent.end.date),
              location: extEvent.location || existingEvent.location,
              isAllDay: !!extEvent.start.date,
              updatedAt: new Date()
            })
            .where(eq(calendarEvents.id, existingEvent.id));
        } else {
          // Create new event if it seems relevant
          if (this.isRelevantExternalEvent(extEvent)) {
            await db.insert(calendarEvents)
              .values({
                calendarId,
                externalEventId: extEvent.id,
                title: extEvent.summary,
                description: extEvent.description,
                startDate: new Date(extEvent.start.dateTime || extEvent.start.date),
                endDate: new Date(extEvent.end.dateTime || extEvent.end.date),
                location: extEvent.location,
                isAllDay: !!extEvent.start.date,
                eventType: "external",
                recurrence: extEvent.recurrence ? "custom" : null,
                metadata: {
                  originalEvent: extEvent
                }
              });
          }
        }
      }
      
      // Update the last synced timestamp
      await db.update(userCalendars)
        .set({ lastSyncedAt: new Date() })
        .where(eq(userCalendars.id, calendarId));
      
      return true;
    } catch (error) {
      console.error("Error syncing external calendar:", error);
      return false;
    }
  }

  /**
   * Determine if an external event is relevant to our system
   */
  private isRelevantExternalEvent(event: any): boolean {
    // Look for keywords in the title or description
    const relevantKeywords = ['birthday', 'wishlist', 'gift', 'present', 'anniversary', 'celebration', 'party'];
    const title = (event.summary || '').toLowerCase();
    const description = (event.description || '').toLowerCase();
    
    for (const keyword of relevantKeywords) {
      if (title.includes(keyword) || description.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check for upcoming events and send reminders
   */
  async processEventReminders(): Promise<number> {
    try {
      const today = new Date();
      const eventsToRemind = [];
      
      // Get all events with reminder settings
      const events = await db.query.calendarEvents.findMany({
        where: and(
          gte(calendarEvents.startDate, today),
          isNotNull(calendarEvents.reminderDays)
        ),
        with: {
          calendar: true
        }
      });
      
      // Check each event
      for (const event of events) {
        if (!event.reminderDays || !event.calendar) continue;
        
        const reminderDate = addDays(event.startDate, -event.reminderDays);
        
        // If the reminder date is today or in the past (and not more than 1 day in the past to avoid missing)
        if (reminderDate <= today && reminderDate >= addDays(today, -1)) {
          eventsToRemind.push(event);
        }
      }
      
      // Send notifications for each event
      for (const event of eventsToRemind) {
        await this.sendEventReminder(event);
      }
      
      return eventsToRemind.length;
    } catch (error) {
      console.error("Error processing event reminders:", error);
      return 0;
    }
  }

  /**
   * Send a notification for an event reminder
   */
  private async sendEventReminder(event: any): Promise<boolean> {
    try {
      const formattedDate = format(event.startDate, 'MMMM do, yyyy');
      
      // Create the notification
      const notification: InsertNotification = {
        userId: event.calendar.userId,
        type: "event_reminder",
        title: `Reminder: ${event.title}`,
        message: `${event.title} is coming up on ${formattedDate} (in ${event.reminderDays} days)`,
        relatedEntityId: event.id,
        relatedEntityType: "calendar_event",
        actionUrl: `/calendar/${event.id}`,
        isRead: false
      };
      
      // If related to a wishlist, add that info
      if (event.relatedEntityType === "wishlist" && event.relatedEntityId) {
        notification.actionUrl = `/wishlists/${event.relatedEntityId}`;
        
        // Get the wishlist details
        const wishlist = await db.query.wishlists.findFirst({
          where: eq(wishlists.id, event.relatedEntityId)
        });
        
        if (wishlist) {
          notification.message = `${wishlist.occasion} is coming up in ${event.reminderDays} days! Remember to check the wishlist "${wishlist.name}"`;
        }
      }
      
      // Send the notification
      await db.insert(notifications).values(notification);
      
      return true;
    } catch (error) {
      console.error("Error sending event reminder:", error);
      return false;
    }
  }

  /**
   * Get all calendars for a user
   */
  async getUserCalendars(userId: number): Promise<any[]> {
    return db.query.userCalendars.findMany({
      where: eq(userCalendars.userId, userId),
      orderBy: [desc(userCalendars.createdAt)]
    });
  }

  /**
   * Get upcoming events for a user
   */
  async getUpcomingEvents(userId: number, days: number = 30): Promise<any[]> {
    // Get all user's calendars
    const userCalendars = await db.query.userCalendars.findMany({
      where: eq(userCalendars.userId, userId),
      with: {
        events: {
          where: and(
            gte(calendarEvents.startDate, new Date()),
            lte(calendarEvents.startDate, addDays(new Date(), days))
          )
        }
      }
    });
    
    // Flatten events from all calendars
    const events = userCalendars.flatMap(calendar => 
      calendar.events.map(event => ({
        ...event,
        calendarName: calendar.displayName,
        calendarType: calendar.calendarType
      }))
    );
    
    // Sort by date
    return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  /**
   * Disconnect a calendar
   */
  async disconnectCalendar(calendarId: number, userId: number): Promise<boolean> {
    // Verify the calendar belongs to the user
    const calendar = await db.query.userCalendars.findFirst({
      where: and(
        eq(userCalendars.id, calendarId),
        eq(userCalendars.userId, userId)
      )
    });
    
    if (!calendar) return false;
    
    // Mark as inactive instead of deleting
    await db.update(userCalendars)
      .set({ isActive: false })
      .where(eq(userCalendars.id, calendarId));
    
    return true;
  }

  /**
   * Create a custom event
   */
  async createCustomEvent(eventData: InsertCalendarEvent): Promise<number | null> {
    try {
      // Insert the event
      const [newEvent] = await db.insert(calendarEvents)
        .values(eventData)
        .returning({ id: calendarEvents.id });
      
      return newEvent.id;
    } catch (error) {
      console.error("Error creating custom event:", error);
      return null;
    }
  }
}