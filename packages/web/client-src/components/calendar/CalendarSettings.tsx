import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ConnectCalendarDialog, CalendarProvider } from './ConnectCalendarDialog';
import { LuCalendarClock, LuCloudSun, LuTrash2 } from 'react-icons/lu';
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

interface ExternalProviderStatus {
  provider: 'google' | 'outlook' | 'apple' | 'facebook';
  connected: boolean;
  supported: boolean;
  message?: string;
}

interface ExternalContactsResponse {
  contacts?: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    primarySource: 'google' | 'outlook' | 'apple' | 'facebook';
    sources: Array<{ provider: 'google' | 'outlook' | 'apple' | 'facebook'; sourceContactId: string }>;
    quality?: {
      score: number;
      level: 'high' | 'medium' | 'low';
      factors: string[];
    };
  }>;
  providerStatuses?: ExternalProviderStatus[];
  metadata?: {
    storageMode?: 'ephemeral';
    returnedContacts?: number;
  };
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

  const [sourceQuery, setSourceQuery] = React.useState('');

  const {
    data: externalContactsResponse,
    isLoading: isLoadingSourceData,
    refetch: refetchSourceData,
  } = useQuery<ExternalContactsResponse>({
    queryKey: ['/api/contacts/external-preview', sourceQuery],
    queryFn: () => apiRequest('/api/contacts/external', {
      method: 'POST',
      body: {
        providers: ['google', 'outlook', 'apple', 'facebook'],
        limit: 30,
        query: sourceQuery.trim() || undefined,
      },
    }) as Promise<ExternalContactsResponse>,
  });

  // Some test mocks and fallback handlers can return non-array payloads.
  // Normalize query results defensively to keep the settings UI resilient.
  const connectedCalendarsList = Array.isArray(connectedCalendars) ? connectedCalendars : [];
  const externalProviderStatuses = Array.isArray(externalContactsResponse?.providerStatuses)
    ? externalContactsResponse?.providerStatuses
    : [];
  const externalContactsPreview = Array.isArray(externalContactsResponse?.contacts)
    ? externalContactsResponse.contacts
    : [];
  const previewExternalContactCount = Array.isArray(externalContactsResponse?.contacts)
    ? externalContactsResponse.contacts.length
    : 0;
  const storageMode = externalContactsResponse?.metadata?.storageMode || 'ephemeral';
  
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

  const formatProviderName = (provider: string): string => {
    if (provider === 'google') return 'Google';
    if (provider === 'outlook') return 'Outlook';
    if (provider === 'apple') return 'Apple';
    if (provider === 'facebook') return 'Facebook';
    return provider;
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

  const formatSourceSummary = (providers: Array<{ provider: 'google' | 'outlook' | 'apple' | 'facebook' }>) => {
    const uniqueProviders = Array.from(new Set(providers.map((source) => formatProviderName(source.provider))));
    return uniqueProviders.join(', ');
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
          <h3 className="text-xl font-semibold">Recipient Source Access</h3>
          <p className="text-sm text-gray-500 mt-1">
            These source connections are used by wishlist recipient forms to pick contacts directly from external providers.
          </p>
        </div>

        {isLoadingSourceData ? (
          <div className="py-2 text-sm text-gray-500">Checking source access...</div>
        ) : externalProviderStatuses.length === 0 ? (
          <div className="py-2 text-sm text-gray-500">No source providers reported yet.</div>
        ) : (
          <div className="space-y-2">
            {externalProviderStatuses.map((status) => (
              <div key={status.provider} className="p-3 border rounded-md flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium">{formatProviderName(status.provider)}</div>
                  {status.message && <div className="text-xs text-gray-500">{status.message}</div>}
                </div>
                <Badge variant={status.connected ? 'default' : 'outline'}>
                  {status.connected ? 'Connected' : status.supported ? 'Not Connected' : 'Capability Available'}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between rounded-md border p-3 text-sm">
          <span>Live contact preview available to recipient forms ({storageMode})</span>
          <Badge variant="outline">{previewExternalContactCount} matches</Badge>
        </div>

        <Button
          variant="outline"
          onClick={() => refetchSourceData()}
          disabled={isLoadingSourceData}
        >
          {isLoadingSourceData ? 'Refreshing source data...' : 'Refresh Source Data'}
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold">External Contact Preview</h3>
          <p className="text-sm text-gray-500 mt-1">
            Contacts are read directly from connected providers and are not stored from this page. They only become wishlist values when selected during wishlist creation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            placeholder="Search provider contacts by name, email, or phone"
            value={sourceQuery}
            onChange={(event) => setSourceQuery(event.target.value)}
          />
          <Button asChild variant="outline">
            <Link href="/app/wishlists">Open Wishlist Creation</Link>
          </Button>
        </div>

        <div className="rounded-md border p-3 text-xs text-gray-600 bg-gray-50">
          Conversion rule: source contacts remain external until you pick one while creating a wishlist recipient.
        </div>

        {isLoadingSourceData ? (
          <div className="py-4 text-sm text-gray-500">Loading external contact preview...</div>
        ) : externalContactsPreview.length === 0 ? (
          <div className="py-4 text-sm text-gray-500">No external contacts found for current source connections.</div>
        ) : (
          <div className="space-y-2">
            {externalContactsPreview.map((contact) => (
              <div key={contact.id} className="p-3 border rounded-md flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-2">
                    {contact.email && <span>{contact.email}</span>}
                    {contact.phone && <span>{contact.phone}</span>}
                    <Badge variant="outline" className="capitalize">{formatSourceSummary(contact.sources)}</Badge>
                    {contact.quality && <Badge variant="outline">{contact.quality.level} quality</Badge>}
                  </div>
                </div>
                <Badge>{formatProviderName(contact.primarySource)}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}