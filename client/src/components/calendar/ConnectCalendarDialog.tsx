import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SiGoogle, SiApple } from 'react-icons/si';
import { FaMicrosoft } from 'react-icons/fa';
import { LuCalendarPlus } from 'react-icons/lu';

// Calendar provider types that match the backend enum
export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'other';

interface ConnectCalendarDialogProps {
  onConnect?: (provider: CalendarProvider) => void;
}

export function ConnectCalendarDialog({ onConnect }: ConnectCalendarDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider | null>(null);
  
  // Fetch auth URLs for each provider
  const { data: googleAuthData, isLoading: isGoogleLoading } = useQuery({
    queryKey: ['/api/calendar/auth/google'],
    queryFn: () => apiRequest('/api/calendar/auth/google', 'GET'),
    enabled: isOpen, // Only fetch when dialog is open
  });
  
  const { data: outlookAuthData, isLoading: isOutlookLoading } = useQuery({
    queryKey: ['/api/calendar/auth/outlook'],
    queryFn: () => apiRequest('/api/calendar/auth/outlook', 'GET'),
    enabled: isOpen, // Only fetch when dialog is open
  });
  
  const { data: appleAuthData, isLoading: isAppleLoading } = useQuery({
    queryKey: ['/api/calendar/auth/apple'],
    queryFn: () => apiRequest('/api/calendar/auth/apple', 'GET'),
    enabled: isOpen, // Only fetch when dialog is open
  });
  
  // Handle connecting to a calendar provider
  const handleConnect = (provider: CalendarProvider) => {
    setIsConnecting(true);
    setSelectedProvider(provider);
    
    let authUrl = '';
    
    switch (provider) {
      case 'google':
        authUrl = googleAuthData?.authUrl;
        break;
      case 'outlook':
        authUrl = outlookAuthData?.authUrl;
        break;
      case 'apple':
        authUrl = appleAuthData?.authUrl;
        break;
      default:
        toast({
          title: "Error",
          description: "Unsupported calendar provider",
          variant: "destructive",
        });
        setIsConnecting(false);
        return;
    }
    
    if (!authUrl) {
      toast({
        title: "Error",
        description: "Could not get authentication URL",
        variant: "destructive",
      });
      setIsConnecting(false);
      return;
    }
    
    // Open authentication window
    window.location.href = authUrl;
    
    if (onConnect) {
      onConnect(provider);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <LuCalendarPlus className="h-4 w-4" />
          Connect Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Calendar</DialogTitle>
          <DialogDescription>
            Connect your external calendar to sync events with WishKeeper.
            This allows you to see important dates like birthdays and wishlist
            deadlines in your preferred calendar app.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="google" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="google">Google</TabsTrigger>
            <TabsTrigger value="outlook">Outlook</TabsTrigger>
            <TabsTrigger value="apple">Apple</TabsTrigger>
          </TabsList>
          
          <TabsContent value="google" className="py-4">
            <div className="flex flex-col items-center space-y-4">
              <SiGoogle className="h-16 w-16 text-blue-500" />
              <h3 className="text-lg font-medium">Connect Google Calendar</h3>
              <p className="text-sm text-gray-500 text-center">
                Sync your events with Google Calendar. You'll be asked to grant
                permission to access your calendars.
              </p>
              <Button 
                onClick={() => handleConnect('google')} 
                disabled={isGoogleLoading || isConnecting}
                className="w-full"
              >
                {isConnecting && selectedProvider === 'google' ? 'Connecting...' : 'Connect Google Calendar'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="outlook" className="py-4">
            <div className="flex flex-col items-center space-y-4">
              <FaMicrosoft className="h-16 w-16 text-blue-500" />
              <h3 className="text-lg font-medium">Connect Outlook Calendar</h3>
              <p className="text-sm text-gray-500 text-center">
                Sync your events with Microsoft Outlook Calendar. You'll be asked to grant
                permission to access your calendars.
              </p>
              <Button 
                onClick={() => handleConnect('outlook')} 
                disabled={isOutlookLoading || isConnecting}
                className="w-full"
              >
                {isConnecting && selectedProvider === 'outlook' ? 'Connecting...' : 'Connect Outlook Calendar'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="apple" className="py-4">
            <div className="flex flex-col items-center space-y-4">
              <SiApple className="h-16 w-16 text-gray-800" />
              <h3 className="text-lg font-medium">Connect Apple Calendar</h3>
              <p className="text-sm text-gray-500 text-center">
                Sync your events with Apple Calendar. You'll be asked to grant
                permission to access your calendars.
              </p>
              <Button 
                onClick={() => handleConnect('apple')} 
                disabled={isAppleLoading || isConnecting}
                className="w-full"
              >
                {isConnecting && selectedProvider === 'apple' ? 'Connecting...' : 'Connect Apple Calendar'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}