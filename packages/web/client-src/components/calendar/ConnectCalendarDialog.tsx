import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import { SiApple } from 'react-icons/si';
import { FaMicrosoft } from 'react-icons/fa';
import { LuCalendarPlus } from 'react-icons/lu';

// Calendar provider types that match the backend enum
export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'other';

interface CalendarAuthData {
  authUrl?: string;
  url?: string;
  provider: CalendarProvider;
  message?: string;
}

interface ConnectCalendarDialogProps {
  onConnect?: (provider: CalendarProvider) => void;
}

export function ConnectCalendarDialog({ onConnect }: ConnectCalendarDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider | null>(null);
  const [appleSubscriptionUrl, setAppleSubscriptionUrl] = useState('');
  const [appleDisplayName, setAppleDisplayName] = useState('Apple Calendar');

  const redirectUri = useMemo(() => `${window.location.origin}/calendar`, []);

  const connectMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest('/api/calendar/connect', { method: 'POST', body: payload }),
    onSuccess: () => {
      toast({
        title: 'Calendar connected',
        description: 'Your calendar connection is now active.',
      });
      if (onConnect && selectedProvider) {
        onConnect(selectedProvider);
      }
    },
    onError: (error) => {
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Could not complete calendar connection.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsConnecting(false);
      setSelectedProvider(null);
    },
  });

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const code = search.get('code');
    const state = search.get('state');
    const error = search.get('error');
    const providerParam = search.get('provider');

    if (!code && !error) {
      return;
    }

    if (error) {
      toast({
        title: 'Calendar authorization cancelled',
        description: 'Authorization was not completed.',
        variant: 'destructive',
      });
      window.history.replaceState({}, document.title, '/app/calendar');
      return;
    }

    const provider: CalendarProvider = providerParam === 'outlook' ? 'outlook' : 'google';
    setIsConnecting(true);
    setSelectedProvider(provider);
    connectMutation.mutate({
      provider,
      code,
      state,
      redirectUri,
    });

    window.history.replaceState({}, document.title, '/app/calendar');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectUri]);
  
  // Fetch auth URLs for each provider
  const { data: outlookAuthData, isLoading: isOutlookLoading } = useQuery<CalendarAuthData>({
    queryKey: ['/api/calendar/auth/outlook'],
    queryFn: () => apiRequest('/api/calendar/auth/outlook', {
      method: 'POST',
      body: { provider: 'outlook', redirectUri }
    }) as Promise<CalendarAuthData>,
    enabled: isOpen, // Only fetch when dialog is open
  });
  
  const { data: appleAuthData, isLoading: isAppleLoading } = useQuery<CalendarAuthData>({
    queryKey: ['/api/calendar/auth/apple'],
    queryFn: () => apiRequest('/api/calendar/auth/apple', {
      method: 'POST',
      body: { provider: 'apple', redirectUri }
    }) as Promise<CalendarAuthData>,
    enabled: isOpen, // Only fetch when dialog is open
  });
  
  // Handle connecting to a calendar provider
  const handleConnect = (provider: CalendarProvider) => {
    setIsConnecting(true);
    setSelectedProvider(provider);
    
    let authUrl = '';
    
    switch (provider) {
      case 'outlook':
        authUrl = outlookAuthData?.authUrl || outlookAuthData?.url || '';
        break;
      case 'apple':
        authUrl = appleAuthData?.authUrl || appleAuthData?.url || '';
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
    
    if (provider === 'outlook') {
      const url = new URL(authUrl);
      url.searchParams.set('provider', provider);
      window.location.href = url.toString();
      return;
    }

    window.open(authUrl, '_blank', 'noopener,noreferrer');

    setIsConnecting(false);
    setSelectedProvider(null);
  };

  const handleAppleSubscriptionConnect = () => {
    if (!appleSubscriptionUrl.trim()) {
      toast({
        title: 'Subscription URL required',
        description: 'Enter your Apple calendar subscription URL to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);
    setSelectedProvider('apple');
    connectMutation.mutate({
      provider: 'apple',
      subscriptionUrl: appleSubscriptionUrl.trim(),
      displayName: appleDisplayName.trim() || 'Apple Calendar',
    });
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
            Connect your external calendar to sync events with Wishlist Wizard.
            This allows you to see important dates like birthdays and wishlist
            deadlines in your preferred calendar app.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="outlook" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="outlook">Outlook</TabsTrigger>
            <TabsTrigger value="apple">Apple</TabsTrigger>
          </TabsList>
          
          <TabsContent value="outlook" className="py-4">
            <div className="flex flex-col items-center space-y-4">
              <FaMicrosoft className="h-16 w-16 text-emerald-700" />
              <h3 className="text-lg font-medium">Connect Outlook Calendar</h3>
              <p className="text-sm text-gray-500 text-center">
                Sync your events with Microsoft Outlook Calendar. You&apos;ll be asked to grant
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
                Add your Apple Calendar subscription URL for read-only import sync.
              </p>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="webcal://... or https://..."
                value={appleSubscriptionUrl}
                onChange={(event) => setAppleSubscriptionUrl(event.target.value)}
              />
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Display name"
                value={appleDisplayName}
                onChange={(event) => setAppleDisplayName(event.target.value)}
              />
              {appleAuthData?.message && (
                <p className="text-xs text-gray-500 text-center">{appleAuthData.message}</p>
              )}
              <Button 
                onClick={handleAppleSubscriptionConnect}
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