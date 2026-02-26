import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarComponent, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { parseISO } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CalendarSettings } from '@/components/calendar/CalendarSettings';

// Define interfaces for API responses
interface CalendarEventResponse {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  location?: string;
  type: string;
  recurYearly: boolean;
  reminderDays?: number;
  beneficiaryId?: number;
  wishlistId?: number;
  color: string;
}

// Set up the localizer for react-big-calendar
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Event type definition
type CalendarEvent = {
  id: number;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  type: string;
  recurYearly: boolean;
  reminderDays?: number;
  beneficiaryId?: number;
  wishlistId?: number;
  color: string;
};

// Event form data type
type EventFormData = {
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
  location: string;
  type: string;
  recurYearly: boolean;
  reminderDays: number;
  beneficiaryId?: number;
  wishlistId?: number;
  color: string;
  sharedWith: string[];
};

// Beneficiary type
type Beneficiary = {
  id: number;
  name: string;
};

// Wishlist type
type Wishlist = {
  id: number;
  name: string;
};

// Default colors for event types
const eventTypeColors = {
  birthday: '#FF5733',
  holiday: '#33FF57',
  anniversary: '#3357FF',
  reminder: '#F3FF33',
  deadline: '#FF33F3',
  occasion: '#33FFF3'
};

const Calendar: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startDate: new Date(),
    allDay: true,
    location: '',
    type: 'reminder',
    recurYearly: false,
    reminderDays: 7,
    color: '#6366F1',
    sharedWith: []
  });

  // Query to fetch events
  const { data: events = [] } = useQuery({ 
    queryKey: ['/api/calendar/events'],
    queryFn: async () => {
      const data = await apiRequest('/api/calendar/events') as CalendarEventResponse[];
      // Parse date strings into Date objects
      return data.map((event: CalendarEventResponse) => ({
        ...event,
        start: parseISO(event.startDate),
        end: event.endDate ? parseISO(event.endDate) : parseISO(event.startDate),
      }));
    }
  });

  // Query to fetch beneficiaries
  const { data: beneficiaries = [] } = useQuery({ 
    queryKey: ['/api/beneficiaries'],
    queryFn: async () => {
      const data = await apiRequest('/api/beneficiaries');
      return data as Beneficiary[];
    }
  });

  // Query to fetch wishlists
  const { data: wishlists = [] } = useQuery({ 
    queryKey: ['/api/wishlists'],
    queryFn: async () => {
      const data = await apiRequest('/api/wishlists');
      return data as Wishlist[];
    }
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (eventData: EventFormData) => {
      return apiRequest('/api/calendar/events', { 
        method: 'POST', 
        body: {
          title: eventData.title,
          description: eventData.description,
          startDate: eventData.startDate.toISOString(),
          endDate: eventData.endDate?.toISOString(),
          allDay: eventData.allDay,
          location: eventData.location,
          type: eventData.type,
          recurYearly: eventData.recurYearly,
          reminderDays: eventData.reminderDays,
          beneficiaryId: eventData.beneficiaryId,
          wishlistId: eventData.wishlistId,
          color: eventData.color,
          sharedWith: eventData.sharedWith
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setIsEventDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Event created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: (eventData: EventFormData & { id: number }) => {
      return apiRequest(`/api/calendar/events/${eventData.id}`, { 
        method: 'PATCH', 
        body: {
          title: eventData.title,
          description: eventData.description,
          startDate: eventData.startDate.toISOString(),
          endDate: eventData.endDate?.toISOString(),
          allDay: eventData.allDay,
          location: eventData.location,
          type: eventData.type,
          recurYearly: eventData.recurYearly,
          reminderDays: eventData.reminderDays,
          beneficiaryId: eventData.beneficiaryId,
          wishlistId: eventData.wishlistId,
          color: eventData.color,
          sharedWith: eventData.sharedWith
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
      resetForm();
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => {
      return apiRequest(`/api/calendar/events/${eventId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
      resetForm();
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Helper to reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startDate: new Date(),
      allDay: true,
      location: '',
      type: 'reminder',
      recurYearly: false,
      reminderDays: 7,
      color: '#6366F1',
      sharedWith: []
    });
  };

  // Handle form field changes
  const handleChange = (field: keyof EventFormData, value: string | number | boolean | Date | undefined | number[]) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Event title is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedEvent) {
      updateEventMutation.mutate({
        ...formData,
        id: selectedEvent.id
      });
    } else {
      createEventMutation.mutate(formData);
    }
  };

  // Handle clicking on calendar slot
  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedEvent(null);
    setFormData(prevData => ({
      ...prevData,
      startDate: start,
      endDate: start
    }));
    setIsEventDialogOpen(true);
  };

  // Handle clicking on event
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      startDate: event.start,
      endDate: event.end,
      allDay: event.allDay,
      location: event.location || '',
      type: event.type,
      recurYearly: event.recurYearly,
      reminderDays: event.reminderDays || 7,
      beneficiaryId: event.beneficiaryId,
      wishlistId: event.wishlistId,
      color: event.color,
      sharedWith: []
    });
    setIsEventDialogOpen(true);
  };

  // Handle delete event
  const handleDeleteEvent = () => {
    if (selectedEvent) {
      if (window.confirm(`Are you sure you want to delete "${selectedEvent.title}"?`)) {
        deleteEventMutation.mutate(selectedEvent.id);
      }
    }
  };

  // Event style getter for calendar
  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '3px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        padding: '3px'
      }
    };
  };

  // Render upcoming events list
  const renderUpcomingEvents = () => {
    const now = new Date();
    const upcoming = events
      .filter((event: CalendarEvent) => event.start >= now)
      .sort((a: CalendarEvent, b: CalendarEvent) => a.start.getTime() - b.start.getTime())
      .slice(0, 10);

    return (
      <div className="space-y-4">
        {upcoming.length === 0 ? (
          <p className="text-center text-gray-500">No upcoming events.</p>
        ) : (
          upcoming.map((event: CalendarEvent) => (
            <div 
              key={event.id} 
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center"
              onClick={() => handleSelectEvent(event)}
            >
              <div>
                <h3 className="font-semibold">{event.title}</h3>
                <div className="text-sm text-gray-500">
                  {format(event.start, 'PPP')}
                  {event.allDay ? ' (All day)' : ` at ${format(event.start, 'p')}`}
                </div>
                {event.description && (
                  <p className="text-sm text-gray-700 mt-1">{event.description}</p>
                )}
              </div>
              <Badge 
                style={{backgroundColor: event.color}}
                className="text-white"
              >
                {event.type}
              </Badge>
            </div>
          ))
        )}
      </div>
    );
  };

  // Render birthdays list
  const renderBirthdays = () => {
    const birthdays = events.filter((event: CalendarEvent) => event.type === 'birthday');
    
    return (
      <div className="space-y-4">
        {birthdays.length === 0 ? (
          <p className="text-center text-gray-500">No birthdays added yet.</p>
        ) : (
          birthdays.map((event: CalendarEvent) => (
            <div 
              key={event.id} 
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => handleSelectEvent(event)}
            >
              <h3 className="font-semibold">{event.title}</h3>
              <div className="text-sm text-gray-500">
                {format(event.start, 'MMMM d')}
                {event.recurYearly && " (Yearly)"}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // Render wishlists deadlines
  const renderWishlistDeadlines = () => {
    const deadlines = events.filter((event: CalendarEvent) => 
      event.type === 'deadline' && event.wishlistId
    );
    
    return (
      <div className="space-y-4">
        {deadlines.length === 0 ? (
          <p className="text-center text-gray-500">No wishlist deadlines set.</p>
        ) : (
          deadlines.map((event: CalendarEvent) => (
            <div 
              key={event.id} 
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => handleSelectEvent(event)}
            >
              <h3 className="font-semibold">{event.title}</h3>
              <div className="text-sm text-gray-500">
                {format(event.start, 'PPP')}
              </div>
              <div className="mt-2">
                <Badge>
                  {wishlists.find((w: Wishlist) => w.id === event.wishlistId)?.name || 'Unknown wishlist'}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Calendar | Wishlist Wizard</title>
        <meta name="description" content="Manage important dates, birthdays, and gift deadlines with our interactive calendar." />
      </Helmet>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">Calendar</h1>
            <p className="text-gray-600 mt-2">
              Manage important dates and track gift opportunities
            </p>
          </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            setSelectedEvent(null);
            resetForm();
            setIsEventDialogOpen(true);
          }}>
            Add Event
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('connections')}>
            Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow">
            <CalendarComponent
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              className="calendar-container"
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              eventPropGetter={eventStyleGetter}
            />
          </div>
        </div>

        <div>
          <div className="bg-white p-4 rounded-lg shadow">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="birthdays">Birthdays</TabsTrigger>
                <TabsTrigger value="wishlists">Deadlines</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="pt-4">
                {renderUpcomingEvents()}
              </TabsContent>
              <TabsContent value="birthdays" className="pt-4">
                {renderBirthdays()}
              </TabsContent>
              <TabsContent value="wishlists" className="pt-4">
                {renderWishlistDeadlines()}
              </TabsContent>
              <TabsContent value="connections" className="pt-4">
                <CalendarSettings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Create/Edit Event Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
            <DialogDescription>
              {selectedEvent ? 'Update the event details below.' : 'Add a new event to your calendar.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => {
                    handleChange('type', value);
                    // Set default color based on type
                    if (eventTypeColors[value as keyof typeof eventTypeColors]) {
                      handleChange('color', eventTypeColors[value as keyof typeof eventTypeColors]);
                    }
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="deadline">Gift Deadline</SelectItem>
                    <SelectItem value="occasion">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">
                  Date
                </Label>
                <div className="col-span-3">
                  <DatePicker
                    selected={formData.startDate}
                    onSelect={(date) => date && handleChange('startDate', date)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="allDay">
                  All Day
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Checkbox 
                    id="allDay" 
                    checked={formData.allDay}
                    onCheckedChange={(checked) => handleChange('allDay', !!checked)}
                  />
                  <label
                    htmlFor="allDay"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    This is an all-day event
                  </label>
                </div>
              </div>
              
              {formData.type === 'birthday' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="recurYearly">
                    Yearly
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Checkbox 
                      id="recurYearly" 
                      checked={formData.recurYearly}
                      onCheckedChange={(checked) => handleChange('recurYearly', !!checked)}
                    />
                    <label
                      htmlFor="recurYearly"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Repeat this event yearly
                    </label>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="col-span-3"
                  placeholder="Optional"
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="col-span-3"
                  placeholder="Optional"
                />
              </div>
              
              {(formData.type === 'birthday' || formData.type === 'anniversary') && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="beneficiary" className="text-right">
                    Person
                  </Label>
                  <Select 
                    value={formData.beneficiaryId?.toString() || ''} 
                    onValueChange={(value) => handleChange('beneficiaryId', value ? parseInt(value) : undefined)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a person" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {beneficiaries.map((beneficiary: Beneficiary) => (
                        <SelectItem key={beneficiary.id} value={beneficiary.id.toString()}>
                          {beneficiary.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {formData.type === 'deadline' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="wishlist" className="text-right">
                    Wishlist
                  </Label>
                  <Select 
                    value={formData.wishlistId?.toString() || ''} 
                    onValueChange={(value) => handleChange('wishlistId', value ? parseInt(value) : undefined)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a wishlist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {wishlists.map((wishlist: Wishlist) => (
                        <SelectItem key={wishlist.id} value={wishlist.id.toString()}>
                          {wishlist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reminderDays" className="text-right">
                  Reminder
                </Label>
                <Select 
                  value={formData.reminderDays.toString()} 
                  onValueChange={(value) => handleChange('reminderDays', parseInt(value))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Remind me" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">On the day</SelectItem>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="7">1 week before</SelectItem>
                    <SelectItem value="14">2 weeks before</SelectItem>
                    <SelectItem value="30">1 month before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="color" className="text-right">
                  Color
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <input
                    type="color"
                    id="color"
                    value={formData.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="p-1 h-10 w-10 border rounded"
                    aria-label="Event color"
                  />
                  {/* eslint-disable-next-line */}
                  <div
                    className="calendar-color-preview"
                    style={{ backgroundColor: formData.color }}
                  ></div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              {selectedEvent && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteEvent}
                  className="mr-auto"
                >
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      </div>
    </>
  );
};

export default Calendar;