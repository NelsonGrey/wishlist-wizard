import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConnectCalendarDialog, CalendarProvider } from './ConnectCalendarDialog';
import { LuCalendarClock, LuCloudSun, LuTrash2, LuUserPlus, LuEyeOff, LuUpload } from 'react-icons/lu';
import { SiGoogle, SiApple } from 'react-icons/si';
import { FaMicrosoft } from 'react-icons/fa';
import { format } from 'date-fns';

// Calendar interface matching the backend structure
interface ConnectedCalendar {
  id: number;
  calendarType: CalendarProvider;
  displayName: string;
  isActive: boolean;
  lastSyncedAt?: string;
  settings: {
    syncEvents: boolean;
    syncDirection: 'bidirectional' | 'import' | 'export';
    defaultReminders: number[];
  };
}

interface CalendarSettings {
  syncEvents: boolean;
  syncDirection: 'bidirectional' | 'import' | 'export';
  defaultReminders: number[];
}

interface ImportedContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  sourceProvider?: 'google' | 'outlook' | 'apple' | string;
}

export function CalendarSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch connected calendars
  const { 
    data: connectedCalendars = [], 
    isLoading: isLoadingCalendars,
    refetch: refetchCalendars
  } = useQuery<ConnectedCalendar[]>({ 
    queryKey: ['/api/calendar/connections'],
    queryFn: () => apiRequest('/api/calendar/connections') as Promise<ConnectedCalendar[]>
  });

  const {
    data: contacts = [],
    isLoading: isLoadingContacts,
  } = useQuery<ImportedContact[]>({
    queryKey: ['/api/contacts'],
    queryFn: () => apiRequest('/api/contacts') as Promise<ImportedContact[]>
  });

  // Some test mocks and fallback handlers can return non-array payloads.
  // Normalize query results defensively to keep the settings UI resilient.
  const connectedCalendarsList = Array.isArray(connectedCalendars) ? connectedCalendars : [];
  const contactsList = Array.isArray(contacts) ? contacts : [];

  const [appleVcard, setAppleVcard] = React.useState('');
  const [appleConnectionId, setAppleConnectionId] = React.useState('');
  
  // Disconnect calendar mutation
  const disconnectMutation = useMutation({
    mutationFn: (calendarId: number) => {
      return apiRequest(`/api/calendar/connections/${calendarId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/connections'] });
      toast({
        title: "Success",
        description: "Calendar disconnected successfully",
      });
    },
    onError: (error) => {
      console.error('Error disconnecting calendar:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect calendar. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Sync calendar mutation
  const syncMutation = useMutation({
    mutationFn: (calendarId: number) => {
      return apiRequest(`/api/calendar/connections/${calendarId}/sync`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/connections'] });
      toast({
        title: "Success",
        description: "Calendar synced successfully",
      });
    },
    onError: (error) => {
      console.error('Error syncing calendar:', error);
      toast({
        title: "Error",
        description: "Failed to sync calendar. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: ({ calendarId, settings }: { calendarId: number, settings: CalendarSettings }) => {
      return apiRequest(`/api/calendar/connections/${calendarId}/settings`, { method: 'PATCH', body: { settings } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/connections'] });
      toast({
        title: "Success",
        description: "Calendar settings updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating calendar settings:', error);
      toast({
        title: "Error",
        description: "Failed to update calendar settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const importContactsMutation = useMutation({
    mutationFn: ({ provider, payload }: { provider: 'google' | 'outlook' | 'apple', payload?: Record<string, unknown> }) => {
      return apiRequest('/api/contacts/import', { method: 'POST', body: { provider, ...(payload || {}) } });
    },
    onSuccess: (result: unknown, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      const response = (result || {}) as { imported?: number; skipped?: number };
      toast({
        title: 'Contacts imported',
        description: `${response.imported ?? 0} imported, ${response.skipped ?? 0} skipped from ${variables.provider}.`,
      });
      if (variables.provider === 'apple') {
        setAppleVcard('');
      }
    },
    onError: (error) => {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Could not import contacts.',
        variant: 'destructive',
      });
    },
  });

  const hideContactMutation = useMutation({
    mutationFn: (contactId: string) => apiRequest(`/api/contacts/${contactId}/hide`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: 'Contact hidden',
        description: 'The contact is hidden in Wishlist Wizard only.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hide failed',
        description: error instanceof Error ? error.message : 'Unable to hide contact.',
        variant: 'destructive',
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) => apiRequest(`/api/contacts/${contactId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: 'Contact removed',
        description: 'The contact was deleted from Wishlist Wizard only.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete contact.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle calendar connection
  const handleCalendarConnected = () => {
    // Refresh the calendars list after connecting
    setTimeout(() => {
      refetchCalendars();
    }, 2000);
  };
  
  // Handle disconnecting a calendar
  const handleDisconnect = (calendarId: number) => {
    if (window.confirm("Are you sure you want to disconnect this calendar?")) {
      disconnectMutation.mutate(calendarId);
    }
  };
  
  // Handle syncing a calendar
  const handleSync = (calendarId: number) => {
    syncMutation.mutate(calendarId);
  };
  
  // Handle toggling sync for a calendar
  const handleToggleSync = (calendar: ConnectedCalendar, enabled: boolean) => {
    const newSettings = {
      ...calendar.settings,
      syncEvents: enabled
    };
    
    updateSettingsMutation.mutate({
      calendarId: calendar.id,
      settings: newSettings
    });
  };

  const connectedByProvider = {
    google: connectedCalendarsList.find((calendar) => calendar.calendarType === 'google')?.id,
    outlook: connectedCalendarsList.find((calendar) => calendar.calendarType === 'outlook')?.id,
    apple: connectedCalendarsList.find((calendar) => calendar.calendarType === 'apple')?.id,
  };
  
  // Get icon for calendar type
  const getCalendarIcon = (type: CalendarProvider) => {
    switch (type) {
      case 'google':
        return <SiGoogle className="h-5 w-5 text-emerald-800" />;
      case 'outlook':
        return <FaMicrosoft className="h-5 w-5 text-emerald-800" />;
      case 'apple':
        return <SiApple className="h-5 w-5 text-gray-800" />;
      default:
        return <LuCalendarClock className="h-5 w-5 text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Calendar Connections</h2>
        <ConnectCalendarDialog onConnect={handleCalendarConnected} />
      </div>
      
      <Separator />
      
      {isLoadingCalendars ? (
        <div className="py-8 text-center text-gray-500">Loading calendars...</div>
      ) : connectedCalendarsList.length === 0 ? (
        <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed">
          <LuCalendarClock className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">No calendars connected</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Connect your external calendars to sync events with Wishlist Wizard.
            This allows you to see important dates like birthdays and wishlist
            deadlines in your preferred calendar app.
          </p>
          <div className="mt-6">
            <ConnectCalendarDialog onConnect={handleCalendarConnected} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {connectedCalendarsList.map((calendar: ConnectedCalendar) => (
            <div key={calendar.id} className="p-4 border rounded-lg bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getCalendarIcon(calendar.calendarType)}
                  <div>
                    <h3 className="font-medium">{calendar.displayName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Badge variant="outline" className="capitalize">
                        {calendar.calendarType}
                      </Badge>
                      {calendar.lastSyncedAt && (
                        <span>
                          Last synced: {format(new Date(calendar.lastSyncedAt), 'PP p')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSync(calendar.id)}
                    disabled={syncMutation.isPending}
                  >
                    <LuCloudSun className="h-4 w-4 mr-2" />
                    Sync
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDisconnect(calendar.id)}
                    disabled={disconnectMutation.isPending}
                  >
                    <LuTrash2 className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id={`sync-${calendar.id}`}
                    checked={calendar.settings?.syncEvents ?? true}
                    onCheckedChange={(checked) => handleToggleSync(calendar, checked)}
                    disabled={updateSettingsMutation.isPending}
                  />
                  <label
                    htmlFor={`sync-${calendar.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Enable event synchronization
                  </label>
                </div>
                
                <div className="text-sm text-gray-500">
                  {calendar.settings?.syncDirection === 'bidirectional' ? 
                    'Two-way sync' : 
                    calendar.settings?.syncDirection === 'import' ? 
                      'Import only' : 'Export only'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold">Contacts</h3>
          <p className="text-sm text-gray-500 mt-1">
            Import from Google, Microsoft, or Apple. Hide and delete actions affect Wishlist Wizard only and never change source provider data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            disabled={importContactsMutation.isPending || !connectedByProvider.google}
            onClick={() => importContactsMutation.mutate({ provider: 'google', payload: { connectionId: connectedByProvider.google } })}
          >
            <LuUserPlus className="h-4 w-4 mr-2" />
            Import Google
          </Button>
          <Button
            variant="outline"
            disabled={importContactsMutation.isPending || !connectedByProvider.outlook}
            onClick={() => importContactsMutation.mutate({ provider: 'outlook', payload: { connectionId: connectedByProvider.outlook } })}
          >
            <LuUserPlus className="h-4 w-4 mr-2" />
            Import Outlook
          </Button>
          <Button
            variant="outline"
            disabled={importContactsMutation.isPending || !appleVcard.trim()}
            onClick={() => importContactsMutation.mutate({ provider: 'apple', payload: { connectionId: appleConnectionId || connectedByProvider.apple, vcard: appleVcard } })}
          >
            <LuUpload className="h-4 w-4 mr-2" />
            Import Apple vCard
          </Button>
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Apple connection ID (optional)"
            value={appleConnectionId}
            onChange={(event) => setAppleConnectionId(event.target.value)}
          />
          <Textarea
            value={appleVcard}
            onChange={(event) => setAppleVcard(event.target.value)}
            placeholder="Paste Apple vCard content here (BEGIN:VCARD ... END:VCARD)"
            rows={5}
          />
        </div>

        {isLoadingContacts ? (
          <div className="py-4 text-sm text-gray-500">Loading imported contacts...</div>
        ) : contactsList.length === 0 ? (
          <div className="py-4 text-sm text-gray-500">No imported contacts yet.</div>
        ) : (
          <div className="space-y-2">
            {contactsList.map((contact) => (
              <div key={contact.id} className="p-3 border rounded-md flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-2">
                    {contact.email && <span>{contact.email}</span>}
                    {contact.phone && <span>{contact.phone}</span>}
                    {contact.sourceProvider && <Badge variant="outline" className="capitalize">{contact.sourceProvider}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={hideContactMutation.isPending}
                    onClick={() => hideContactMutation.mutate(contact.id)}
                  >
                    <LuEyeOff className="h-4 w-4 mr-1" />
                    Hide
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deleteContactMutation.isPending}
                    onClick={() => deleteContactMutation.mutate(contact.id)}
                  >
                    <LuTrash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}