import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Lock,
  Calendar as CalendarIcon,
  Palette,
  Globe,
  Users,
  UserCheck,
  UserCog,
  CreditCard,
  ShieldCheck,
  History,
  LogOut,
  Receipt,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { CalendarSettings } from '@/components/calendar/CalendarSettings';

type SettingsTab = 'account' | 'notifications' | 'privacy' | 'calendar' | 'preferences';

const VALID_TABS: SettingsTab[] = ['account', 'notifications', 'privacy', 'calendar', 'preferences'];

interface UserDefaultPrivacy {
  defaultWishlistVisibility: string;
  defaultItemVisibility: string;
  allowComments: boolean;
  allowReservations: boolean;
  requireApproval: boolean;
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone with the link can view', icon: Globe, color: 'text-green-600' },
  { value: 'friends', label: 'Friends Only', description: "Only people you've connected with can view", icon: Users, color: 'text-emerald-700' },
  { value: 'private', label: 'Private', description: 'Only you can view', icon: Lock, color: 'text-red-600' },
  { value: 'custom', label: 'Custom Access', description: 'Only specific people you choose', icon: UserCheck, color: 'text-emerald-800' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System Default' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English (US)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
];

function getTabFromUrl(): SettingsTab {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  return VALID_TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : 'notifications';
}

export default function Settings() {
  const isStripeReady = Boolean(String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim());
  const [selectedTab, setSelectedTab] = useState<SettingsTab>(getTabFromUrl);
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('USD');

  const { data: defaultPrivacy } = useQuery<UserDefaultPrivacy>({
    queryKey: ['user-default-privacy'],
    queryFn: () => apiRequest('/api/privacy/defaults') as Promise<UserDefaultPrivacy>,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', selectedTab);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', nextUrl);
  }, [selectedTab]);

  useEffect(() => {
    const onPopState = () => setSelectedTab(getTabFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'account', label: 'Account', icon: <UserCog size={18} aria-hidden="true" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} aria-hidden="true" /> },
    { id: 'privacy', label: 'Privacy', icon: <Lock size={18} aria-hidden="true" /> },
    { id: 'calendar', label: 'Calendar Connections', icon: <CalendarIcon size={18} aria-hidden="true" /> },
    { id: 'preferences', label: 'Preferences', icon: <Palette size={18} aria-hidden="true" /> },
  ];

  return (
    <>
      <Helmet>
        <title>Settings | Wishlist Wizard</title>
        <meta name="description" content="Manage notifications, privacy defaults, calendar connections, and app preferences." />
      </Helmet>
      <div data-testid="settings-page" className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
        <h1 data-testid="settings-title" className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent mb-8">
          Settings
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-0">
                <nav className="flex flex-col" aria-label="Settings sections">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      data-testid={`settings-tab-${tab.id}`}
                      className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === tab.id ? 'bg-muted font-medium' : ''}`}
                      onClick={() => setSelectedTab(tab.id)}
                      aria-pressed={selectedTab === tab.id}
                      aria-label={`Open ${tab.label} section`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {selectedTab === 'account' && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage billing, security, and account-level actions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isStripeReady ? (
                    <>
                      <div className="space-y-3">
                        <h3 className="text-base font-medium">Payment Methods</h3>
                        <div className="space-y-2">
                          <Button variant="outline" size="sm">
                            <CreditCard size={16} className="mr-2" />
                            Add Payment Method
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-base font-medium">Payment History</h3>
                        <div className="text-center py-8 text-muted-foreground">
                          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">No payment history available</p>
                          <p className="text-xs mt-1">Your contribution and purchase history will appear here</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground" data-testid="profile-payments-deferred">
                      Payments and checkout features are coming in v1.1.
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-base font-medium">Security</h3>
                    <div className="flex justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-muted-foreground">Last updated 3 months ago</p>
                      </div>
                      <Button variant="outline" size="sm">Change Password</Button>
                    </div>
                    <div className="flex justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-medium flex items-center">
                          Two-Factor Authentication
                          <ShieldCheck size={16} className="ml-2 text-green-600" />
                        </p>
                        <p className="text-sm text-muted-foreground">Enabled via Authenticator App</p>
                      </div>
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <h3 className="text-base font-medium">Account Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <History size={16} className="mr-2" />
                        Download Your Data
                      </Button>
                      <Button variant="outline" size="sm">
                        <LogOut size={16} className="mr-2" />
                        Log Out of All Devices
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                            Delete Account
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Your Account?</DialogTitle>
                            <DialogDescription>
                              This action cannot be undone. All your wishlists, preferences, and data will be permanently deleted.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 py-4">
                            <p className="text-sm text-muted-foreground">
                              Please type &quot;delete my account&quot; to confirm:
                            </p>
                            <Input placeholder="delete my account" />
                          </div>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button variant="destructive">Delete Account</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedTab === 'notifications' && <NotificationSettings />}

            {selectedTab === 'privacy' && (
              <Card>
                <CardHeader>
                  <CardTitle>Default Privacy Preferences</CardTitle>
                  <CardDescription>
                    Your default privacy settings for new wishlists and items. To adjust privacy for a specific wishlist or item, use its own sharing controls.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Default Wishlist Visibility</Label>
                    <RadioGroup value={defaultPrivacy?.defaultWishlistVisibility || 'public'} className="mt-2">
                      {VISIBILITY_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`wishlist-${option.value}`} disabled />
                            <Label htmlFor={`wishlist-${option.value}`} className="flex items-center space-x-2 opacity-80">
                              <Icon className={`h-4 w-4 ${option.color}`} />
                              <div>
                                <span className="font-medium">{option.label}</span>
                                <p className="text-sm text-muted-foreground">{option.description}</p>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-medium">Default Item Visibility</Label>
                    <RadioGroup value={defaultPrivacy?.defaultItemVisibility || 'public'} className="mt-2">
                      {VISIBILITY_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`item-${option.value}`} disabled />
                            <Label htmlFor={`item-${option.value}`} className="flex items-center space-x-2 opacity-80">
                              <Icon className={`h-4 w-4 ${option.color}`} />
                              <div>
                                <span className="font-medium">{option.label}</span>
                                <p className="text-sm text-muted-foreground">{option.description}</p>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-base font-medium">Interaction Permissions</Label>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allow-comments">Allow Comments</Label>
                        <p className="text-sm text-muted-foreground">Let others comment on your wishlists and items</p>
                      </div>
                      <Switch id="allow-comments" checked={defaultPrivacy?.allowComments ?? true} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allow-reservations">Allow Reservations</Label>
                        <p className="text-sm text-muted-foreground">Let others reserve items for purchase</p>
                      </div>
                      <Switch id="allow-reservations" checked={defaultPrivacy?.allowReservations ?? true} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="require-approval">Require Approval</Label>
                        <p className="text-sm text-muted-foreground">Require your approval for reservations and comments</p>
                      </div>
                      <Switch id="require-approval" checked={defaultPrivacy?.requireApproval ?? false} disabled />
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Editing default privacy preferences is coming soon. For now, adjust privacy per wishlist or item from its own sharing controls.
                  </p>
                </CardContent>
              </Card>
            )}

            {selectedTab === 'calendar' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect external calendars to sync events and import contacts for recipient selection.
                </p>
                <CalendarSettings />
              </div>
            )}

            {selectedTab === 'preferences' && (
              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>Appearance and regional settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-base font-medium">Appearance</h3>
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="theme-select">Theme</Label>
                      <select
                        id="theme-select"
                        className="border rounded-md p-2"
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        title="Select your preferred theme"
                      >
                        {THEME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Regional Settings</h3>
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="language-select">Language</Label>
                      <select
                        id="language-select"
                        className="border rounded-md p-2"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        title="Select your preferred language"
                      >
                        {LANGUAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="currency-select">Currency</Label>
                      <select
                        id="currency-select"
                        className="border rounded-md p-2"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        title="Select your preferred currency"
                      >
                        {CURRENCY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button disabled>Save Preferences</Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Saving preferences is coming soon.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
