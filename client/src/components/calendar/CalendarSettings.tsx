import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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

export function CalendarSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch connected calendars
  const { 
    data: connectedCalendars = [], 
    isLoading: isLoadingCalendars,
    refetch: refetchCalendars
  } = useQuery({ 
    queryKey: ['/api/calendar/connections'],
    queryFn: () => apiRequest('/api/calendar/connections', 'GET')
  });
  
  // Disconnect calendar mutation
  const disconnectMutation = useMutation({
    mutationFn: (calendarId: number) => {
      return apiRequest(`/api/calendar/connections/${calendarId}`, 'DELETE');
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
      return apiRequest(`/api/calendar/connections/${calendarId}/sync`, 'POST');
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
    mutationFn: ({ calendarId, settings }: { calendarId: number, settings: any }) => {
      return apiRequest(`/api/calendar/connections/${calendarId}/settings`, 'PATCH', { settings });
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
  const handleCalendarConnected = (provider: CalendarProvider) => {
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
  
  // Get icon for calendar type
  const getCalendarIcon = (type: CalendarProvider) => {
    switch (type) {
      case 'google':
        return <SiGoogle className="h-5 w-5 text-blue-500" />;
      case 'outlook':
        return <SiMicrosoft className="h-5 w-5 text-blue-500" />;
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
      ) : connectedCalendars.length === 0 ? (
        <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed">
          <LuCalendarClock className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">No calendars connected</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Connect your external calendars to sync events with WishKeeper.
            This allows you to see important dates like birthdays and wishlist
            deadlines in your preferred calendar app.
          </p>
          <div className="mt-6">
            <ConnectCalendarDialog onConnect={handleCalendarConnected} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {connectedCalendars.map((calendar: ConnectedCalendar) => (
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
                    <LuCloudSync className="h-4 w-4 mr-2" />
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
    </div>
  );
}