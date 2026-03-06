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
import { SiApple, SiGoogle } from 'react-icons/si';
import { FaMicrosoft } from 'react-icons/fa';
import { FaFacebook } from 'react-icons/fa6';
import { LuCalendarPlus } from 'react-icons/lu';

// Calendar provider types that match the backend enum
export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'facebook' | 'other';

interface CalendarAuthData {
  authUrl?: string;
  url?: string;
  provider: CalendarProvider;
  supported?: boolean;
  message?: string;
}

interface ConnectCalendarDialogProps {
  onConnect?: (provider: CalendarProvider) => void;
}

export function ConnectCalendarDialog({ onConnect }: ConnectCalendarDialogProps) {
  const { toast } = useToast();
  const OAUTH_PROVIDER_STORAGE_KEY = 'ww.calendar.oauth.provider';
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider | null>(null);
  const [appleSubscriptionUrl, setAppleSubscriptionUrl] = useState('');
  const [appleDisplayName, setAppleDisplayName] = useState('Apple Calendar');

  const redirectUri = useMemo(() => `${window.location.origin}/app/calendar`, []);

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
      window.sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
      toast({
        title: 'Calendar authorization cancelled',
        description: 'Authorization was not completed.',
        variant: 'destructive',
      });
      window.history.replaceState({}, document.title, '/app/calendar');
      return;
    }

    const storedProvider = window.sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY);
    const provider: CalendarProvider | null = providerParam === 'outlook'
      ? 'outlook'
      : providerParam === 'facebook'
        ? 'facebook'
        : providerParam === 'google'
          ? 'google'
          : storedProvider === 'outlook' || storedProvider === 'facebook' || storedProvider === 'google'
            ? storedProvider
            : null;

    if (!provider) {
      toast({
        title: 'Calendar authorization failed',
        description: 'Could not determine which provider returned from OAuth. Please try again.',
        variant: 'destructive',
      });
      window.history.replaceState({}, document.title, '/app/calendar');
      return;
    }

    window.sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
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
  const { data: googleAuthData, isLoading: isGoogleLoading } = useQuery<CalendarAuthData>({
    queryKey: ['/api/calendar/auth/google'],
    queryFn: () => apiRequest('/api/calendar/auth/google', {
      method: 'POST',
      body: { provider: 'google', redirectUri }
    }) as Promise<CalendarAuthData>,
    enabled: isOpen,
  });

  const { data: outlookAuthData, isLoading: isOutlookLoading } = useQuery<CalendarAuthData>({
    queryKey: ['/api/calendar/auth/outlook'],
    queryFn: () => apiRequest('/api/calendar/auth/outlook', {
      method: 'POST',
      body: { provider: 'outlook', redirectUri }
    }) as Promise<CalendarAuthData>,
    enabled: isOpen,
  });
  
  const { data: appleAuthData, isLoading: isAppleLoading } = useQuery<CalendarAuthData>({
    queryKey: ['/api/calendar/auth/apple'],
    queryFn: () => apiRequest('/api/calendar/auth/apple', {
      method: 'POST',
      body: { provider: 'apple', redirectUri }
    }) as Promise<CalendarAuthData>,
    enabled: isOpen,
  });

  const { data: facebookAuthData, isLoading: isFacebookLoading } = useQuery<CalendarAuthData>({
    queryKey: ['/api/calendar/auth/facebook'],
    queryFn: () => apiRequest('/api/calendar/auth/facebook', {
      method: 'POST',
      body: { provider: 'facebook', redirectUri }
    }) as Promise<CalendarAuthData>,
    enabled: isOpen,
  });
  
  // Handle connecting to a calendar provider
  const handleConnect = (provider: CalendarProvider) => {
    setIsConnecting(true);
    setSelectedProvider(provider);
    
    let authUrl = '';
    let providerMessage = '';
    let providerSupported = true;
    
    switch (provider) {
      case 'google':
        authUrl = googleAuthData?.authUrl || googleAuthData?.url || '';
        providerMessage = googleAuthData?.message || '';
        providerSupported = googleAuthData?.supported !== false;
        break;
      case 'outlook':
        authUrl = outlookAuthData?.authUrl || outlookAuthData?.url || '';
        providerMessage = outlookAuthData?.message || '';
        providerSupported = outlookAuthData?.supported !== false;
        break;
      case 'apple':
        authUrl = appleAuthData?.authUrl || appleAuthData?.url || '';
        providerMessage = appleAuthData?.message || '';
        providerSupported = appleAuthData?.supported !== false;
        break;
      case 'facebook':
        authUrl = facebookAuthData?.authUrl || facebookAuthData?.url || '';
        providerMessage = facebookAuthData?.message || '';
        providerSupported = facebookAuthData?.supported !== false;
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

    if (!providerSupported) {
      toast({
        title: 'Provider unavailable',
        description: providerMessage || `${provider} is not configured in this environment.`,
        variant: 'destructive',
      });
      setIsConnecting(false);
      setSelectedProvider(null);
      return;
    }
    
    if (!authUrl) {
      toast({
        title: "Error",
        description: providerMessage || "Could not get authentication URL",
        variant: "destructive",
      });
      setIsConnecting(false);
      setSelectedProvider(null);
      return;
    }
    
    if (provider === 'outlook' || provider === 'google' || provider === 'facebook') {
      window.sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, provider);
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
        
        <Tabs defaultValue="google" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="google">Google</TabsTrigger>
            <TabsTrigger value="outlook">Outlook</TabsTrigger>
            <TabsTrigger value="apple">Apple</TabsTrigger>
            <TabsTrigger value="facebook">Facebook</TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="py-4">
            <div className="flex flex-col items-center space-y-4">
              <SiGoogle className="h-16 w-16 text-emerald-700" />
              <h3 className="text-lg font-medium">Connect Google Calendar</h3>
              <p className="text-sm text-gray-500 text-center">
                Sync your events with Google Calendar. You&apos;ll be asked to grant
                permission to access your calendars and contacts.
              </p>
              <Button
                onClick={() => handleConnect('google')}
                disabled={isGoogleLoading || isConnecting || googleAuthData?.supported === false}
                className="w-full"
              >
                {isConnecting && selectedProvider === 'google' ? 'Connecting...' : 'Connect Google Calendar'}
              </Button>
              {googleAuthData?.supported === false && googleAuthData?.message && (
                <p className="text-xs text-gray-500 text-center">{googleAuthData.message}</p>
              )}
            </div>
          </TabsContent>
          
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
                disabled={isOutlookLoading || isConnecting || outlookAuthData?.supported === false}
                className="w-full"
              >
                {isConnecting && selectedProvider === 'outlook' ? 'Connecting...' : 'Connect Outlook Calendar'}
              </Button>
              {outlookAuthData?.supported === false && outlookAuthData?.message && (
                <p className="text-xs text-gray-500 text-center">{outlookAuthData.message}</p>
              )}
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

          <TabsContent value="facebook" className="py-4">
            <div className="flex flex-col items-center space-y-4">
              <FaFacebook className="h-16 w-16 text-sky-700" />
              <h3 className="text-lg font-medium">Connect Facebook</h3>
              <p className="text-sm text-gray-500 text-center">
                Connect Facebook to access your friend list for recipient selection.
              </p>
              <Button
                onClick={() => handleConnect('facebook')}
                disabled={isFacebookLoading || isConnecting || facebookAuthData?.supported === false}
                className="w-full"
              >
                {isConnecting && selectedProvider === 'facebook' ? 'Connecting...' : 'Connect Facebook'}
              </Button>
              {facebookAuthData?.supported === false && facebookAuthData?.message && (
                <p className="text-xs text-gray-500 text-center">{facebookAuthData.message}</p>
              )}
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