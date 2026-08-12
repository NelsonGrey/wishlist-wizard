import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Gift,
  HeartHandshake,
  Mail,
  Check,
  ChevronDown,
  Edit3,
  BarChart3,
  Loader2,
  X,
  UserPlus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getApiErrorMessage } from '@/lib/api-errors';
import { uploadAvatar } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_TIER_NAMES, ACHIEVEMENT_TIER_BADGE_CLASSES, WIZARD_TIER } from '@/lib/achievements';
import { useAchievements } from '@/hooks/use-achievements';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';

interface RemoteProfile {
  displayName?: string | null;
  photoURL?: string | null;
  bio?: string;
  location?: string;
  interests?: string[];
  favoriteStores?: string[];
  giftPreferences?: {
    sizes?: { clothing?: string; shoes?: string };
    colors?: string[];
    doNotWant?: string[];
    giftCards?: string[];
  };
}

const createInitialProfile = (
  user?: {
    uid?: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
    metadata?: { creationTime?: string };
  },
  remote?: RemoteProfile
) => ({
  id: user?.uid ? Number.parseInt(user.uid, 10) || 0 : 0,
  username: user?.email?.split('@')[0] || "",
  firstName: (remote?.displayName ?? user?.displayName)?.split(' ')[0] || "",
  lastName: (remote?.displayName ?? user?.displayName)?.split(' ').slice(1).join(' ') || "",
  email: user?.email || "",
  avatar: remote?.photoURL || user?.photoURL || "",
  bio: remote?.bio || "",
  location: remote?.location || "",
  joinDate: user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : "",
  interests: (remote?.interests || []) as string[],
  notifications: {
    email: true,
    push: true,
    priceAlerts: true,
    giftReminders: true,
    wishlistUpdates: true,
    specialOffers: false
  },
  privacySettings: {
    profileVisibility: "friends",
    wishlistDefaultVisibility: "public",
    activityTracking: true,
    allowTagging: true,
    showRecommendations: true
  },
  theme: "system",
  language: "en",
  currency: "USD",
  paymentMethods: [] as Array<{
    id: number;
    type: "credit_card" | "paypal";
    lastFour?: string;
    brand?: string;
    email?: string;
    default: boolean;
  }>,
  giftPreferences: {
    sizes: {
      clothing: remote?.giftPreferences?.sizes?.clothing || "Medium",
      shoes: remote?.giftPreferences?.sizes?.shoes || "US 8"
    },
    colors: (remote?.giftPreferences?.colors || []) as string[],
    doNotWant: (remote?.giftPreferences?.doNotWant || []) as string[],
    giftCards: (remote?.giftPreferences?.giftCards || []) as string[]
  },
  exchangeHistory: [] as Array<{
    id: number;
    date: string;
    type: "Received" | "Gave";
    item: string;
    from?: string;
    to?: string;
    status: string;
  }>,
  favoriteStores: (remote?.favoriteStores || []) as string[]
});

// Common clothing sizes
const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

// Common shoe sizes (US)
const SHOE_SIZES = ["US 5", "US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12", "US 13"];

interface ConnectionUser {
  uid: string;
  displayName: string | null;
  username: string | null;
  photoURL: string | null;
}

interface ConnectionEntry {
  connectionId: string;
  user: ConnectionUser;
}

interface UserSearchResult {
  id: string;
  username: string | null;
  displayName: string | null;
  photoURL: string | null;
}

type ExternalProviderStatus = {
  provider: "google" | "outlook" | "apple" | "facebook";
  connected: boolean;
  supported: boolean;
  message?: string;
};

type ExternalContact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  sources: Array<{ provider: ExternalProviderStatus["provider"]; sourceContactId: string }>;
};

type ExternalContactsResponse = {
  contacts: ExternalContact[];
  providerStatuses: ExternalProviderStatus[];
};

function connectionDisplayName(connectionUser: ConnectionUser): string {
  return connectionUser.displayName || (connectionUser.username ? `@${connectionUser.username}` : "Wishlist Wizard user");
}

const UserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(() => createInitialProfile(user || undefined));
  const [selectedTab, setSelectedTab] = useState("profile");
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState(() => createInitialProfile(user || undefined));
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [connectionFindMode, setConnectionFindMode] = useState<"search" | "contacts" | "email">("search");
  const [connectionSearchQuery, setConnectionSearchQuery] = useState("");
  const [debouncedConnectionSearchQuery, setDebouncedConnectionSearchQuery] = useState("");
  const [connectionEmail, setConnectionEmail] = useState("");
  const { toast } = useToast();
  const { data: achievementsData } = useAchievements();
  const { data: subscriptionStatus } = useSubscriptionStatus();
  const { data: remoteProfile, isLoading: isLoadingProfile } = useQuery<RemoteProfile>({
    queryKey: ['/api/profile'],
    enabled: Boolean(user),
  });

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedConnectionSearchQuery(connectionSearchQuery.trim()), 300);
    return () => clearTimeout(timeout);
  }, [connectionSearchQuery]);

  const { data: connectionsData, isLoading: isLoadingConnections } = useQuery<{ connections: ConnectionEntry[] }>({
    queryKey: ['/api/connections'],
    enabled: Boolean(user) && selectedTab === 'connections',
  });

  const { data: pendingConnectionsData } = useQuery<{ incoming: ConnectionEntry[]; outgoing: ConnectionEntry[] }>({
    queryKey: ['/api/connections/pending'],
    enabled: Boolean(user) && selectedTab === 'connections',
  });

  const { data: connectionSearchResults, isFetching: isSearchingConnections } = useQuery<{ users: UserSearchResult[] }>({
    queryKey: ['/api/users/search', debouncedConnectionSearchQuery],
    queryFn: () =>
      apiRequest(`/api/users/search?q=${encodeURIComponent(debouncedConnectionSearchQuery)}`) as Promise<{
        users: UserSearchResult[];
      }>,
    enabled: selectedTab === 'connections' && connectionFindMode === 'search' && debouncedConnectionSearchQuery.length >= 2,
  });

  // Same /api/contacts/external endpoint InviteCollaboratorDialog.tsx uses -
  // real Google/Outlook/Facebook contacts via the OAuth connections set up
  // in Calendar Settings, Apple via vCard.
  const { data: connectionContactsResponse, isFetching: isLoadingConnectionContacts } = useQuery<ExternalContactsResponse>({
    queryKey: ['/api/contacts/external'],
    queryFn: () =>
      apiRequest('/api/contacts/external', {
        method: 'POST',
        body: { providers: ['google', 'outlook', 'apple', 'facebook'], limit: 200 },
      }) as Promise<ExternalContactsResponse>,
    enabled: selectedTab === 'connections' && connectionFindMode === 'contacts',
    staleTime: 60_000,
  });

  const connections = connectionsData?.connections || [];
  const incomingConnectionRequests = pendingConnectionsData?.incoming || [];
  const outgoingConnectionRequests = pendingConnectionsData?.outgoing || [];
  const connectionContacts = connectionContactsResponse?.contacts || [];
  const connectedConnectionProviders = (connectionContactsResponse?.providerStatuses || []).filter((status) => status.connected);

  const sendConnectionRequestMutation = useMutation({
    mutationFn: async (variables: { targetUserId?: string; email?: string; label: string }) => {
      const result = (await apiRequest('/api/connections/request', {
        method: 'POST',
        body: variables.targetUserId ? { targetUserId: variables.targetUserId } : { email: variables.email },
      })) as { status: 'active' | 'pending' };
      return { ...result, label: variables.label };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/connections/pending'] });
      setConnectionSearchQuery("");
      setConnectionEmail("");
      toast({
        title: result.status === 'active' ? "Connected" : "Request sent",
        description: result.status === 'active'
          ? `You're now connected with ${result.label}.`
          : `Your connection request to ${result.label} is pending.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to send connection request."),
        variant: "destructive",
      });
    },
  });

  const respondToConnectionMutation = useMutation({
    mutationFn: async (variables: { connectionId: string; accept: boolean }) => {
      return apiRequest(`/api/connections/${variables.connectionId}/respond`, {
        method: 'POST',
        body: { accept: variables.accept },
      }) as Promise<{ success: boolean; status: 'accepted' | 'declined' }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/connections/pending'] });
      toast({ title: result.status === 'accepted' ? "Connection accepted" : "Request declined" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to respond to connection request."),
        variant: "destructive",
      });
    },
  });

  const removeConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return apiRequest(`/api/connections/${connectionId}`, { method: 'DELETE' }) as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/connections/pending'] });
      toast({ title: "Connection removed" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to remove connection."),
        variant: "destructive",
      });
    },
  });

  const requestConnectionByUser = (result: UserSearchResult) => {
    sendConnectionRequestMutation.mutate({
      targetUserId: result.id,
      label: result.displayName || (result.username ? `@${result.username}` : "this user"),
    });
  };

  const requestConnectionByContact = (contact: ExternalContact) => {
    if (!contact.email) return;
    sendConnectionRequestMutation.mutate({ email: contact.email, label: contact.name });
  };

  const requestConnectionByEmail = () => {
    const normalizedEmail = connectionEmail.trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast({ title: "Error", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    sendConnectionRequestMutation.mutate({ email: normalizedEmail, label: normalizedEmail });
  };

  const stats = {
    itemsTracked: achievementsData?.achievements?.tracker?.count ?? 0,
    wishlistsCreated: subscriptionStatus?.usage?.wishlistsOwned ?? 0,
    giftsPurchased: achievementsData?.achievements?.['gift-giver']?.count ?? 0,
  };

  useEffect(() => {
    if (!user || editMode) {
      return;
    }

    const mergedProfile = createInitialProfile(user, remoteProfile);
    setProfile(mergedProfile);
    setEditedProfile(mergedProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.email, user?.displayName, user?.photoURL, remoteProfile, editMode]);

  // Update profile settings — PATCH /api/profile (updateMyProfile,
  // packages/functions/src/api/userProfile.ts). email isn't included:
  // changing it needs Firebase Auth's updateEmail + reverification, a
  // separate flow this doesn't build (see the disabled email input below).
  const { mutate: updateProfile, isPending: savingProfile } = useMutation({
    mutationFn: async (updatedProfile: typeof profile) => {
      await apiRequest('/api/profile', {
        method: 'PATCH',
        body: {
          displayName: `${updatedProfile.firstName} ${updatedProfile.lastName}`.trim(),
          bio: updatedProfile.bio,
          location: updatedProfile.location,
          interests: updatedProfile.interests,
          favoriteStores: updatedProfile.favoriteStores,
          giftPreferences: updatedProfile.giftPreferences,
          photoURL: updatedProfile.avatar,
        },
      });
      return updatedProfile;
    },
    onSuccess: (data) => {
      setProfile(data);
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
        duration: 3000
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update profile."),
        variant: "destructive",
      });
    }
  });

  const handleAvatarFileSelected = async (file: File | null) => {
    if (!file || !user) {
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user.uid, file);
      setEditedProfile((prev) => ({ ...prev, avatar: url }));
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload photo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Add an interest
  const addInterest = (interest: string) => {
    if (interest && !editedProfile.interests.includes(interest)) {
      setEditedProfile({
        ...editedProfile,
        interests: [...editedProfile.interests, interest]
      });
    }
  };

  // Remove an interest
  const removeInterest = (interest: string) => {
    setEditedProfile({
      ...editedProfile,
      interests: editedProfile.interests.filter(i => i !== interest)
    });
  };

  // Handle save profile
  const handleSaveProfile = () => {
    updateProfile(editedProfile);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedProfile(profile);
    setEditMode(false);
  };

  // Add favorite store
  const addFavoriteStore = (store: string) => {
    if (store && !editedProfile.favoriteStores.includes(store)) {
      setEditedProfile({
        ...editedProfile,
        favoriteStores: [...editedProfile.favoriteStores, store]
      });
    }
  };

  // Remove favorite store
  const removeFavoriteStore = (store: string) => {
    setEditedProfile({
      ...editedProfile,
      favoriteStores: editedProfile.favoriteStores.filter(s => s !== store)
    });
  };

  // Update gift preference
  const updateGiftPreference = (category: keyof typeof profile.giftPreferences, key: string, value: string) => {
    const updatedPreferences = { ...editedProfile.giftPreferences };
    
    if (category === 'sizes') {
      updatedPreferences.sizes = {
        ...updatedPreferences.sizes,
        [key]: value
      };
    } else if (Array.isArray(updatedPreferences[category])) {
      // For arrays like colors, doNotWant, giftCards
      const preferenceList = updatedPreferences[category] as string[];
      if (value && !preferenceList.includes(value)) {
        updatedPreferences[category] = [...preferenceList, value] as typeof updatedPreferences[typeof category];
      }
    }
    
    setEditedProfile({
      ...editedProfile,
      giftPreferences: updatedPreferences
    });
  };

  // Remove gift preference item (for array-based preferences)
  const removeGiftPreferenceItem = (category: keyof typeof profile.giftPreferences, item: string) => {
    const categoryValue = editedProfile.giftPreferences[category];
    if (Array.isArray(categoryValue)) {
      const updatedPreferences = { ...editedProfile.giftPreferences };
      (updatedPreferences as unknown as Record<string, string[]>)[category] = (categoryValue as string[]).filter((i: string) => i !== item);
      
      setEditedProfile({
        ...editedProfile,
        giftPreferences: updatedPreferences
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Profile | Wishlist Wizard</title>
        <meta name="description" content="Manage your profile, preferences, and account settings." />
      </Helmet>
      <div data-testid="user-profile-page" className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
        <h1 data-testid="user-profile-title" className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent mb-8">Profile & Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <nav className="flex flex-col" aria-label="Profile settings sections">
                <button 
                  type="button"
                  className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === 'profile' ? 'bg-muted font-medium' : ''}`}
                  onClick={() => setSelectedTab('profile')}
                  aria-pressed={selectedTab === 'profile'}
                  aria-label="Open Profile section"
                >
                  <User size={18} aria-hidden="true" />
                  <span>Profile</span>
                </button>
                <button 
                  type="button"
                  className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === 'preferences' ? 'bg-muted font-medium' : ''}`}
                  onClick={() => setSelectedTab('preferences')}
                  aria-pressed={selectedTab === 'preferences'}
                  aria-label="Open Gift Preferences section"
                >
                  <Gift size={18} aria-hidden="true" />
                  <span>Gift Preferences</span>
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === 'connections' ? 'bg-muted font-medium' : ''}`}
                  onClick={() => setSelectedTab('connections')}
                  aria-pressed={selectedTab === 'connections'}
                  aria-label="Open Connections section"
                >
                  <HeartHandshake size={18} aria-hidden="true" />
                  <span>Connections</span>
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === 'stats' ? 'bg-muted font-medium' : ''}`}
                  onClick={() => setSelectedTab('stats')}
                  aria-pressed={selectedTab === 'stats'}
                  aria-label="Open Stats and Achievements section"
                >
                  <BarChart3 size={18} aria-hidden="true" />
                  <span>Stats & Achievements</span>
                </button>
              </nav>
            </CardContent>
          </Card>
          
          {/* User Stats Card */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">My Stats</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items Tracked:</span>
                  <span className="font-medium">{stats.itemsTracked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wishlists Created:</span>
                  <span className="font-medium">{stats.wishlistsCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gifts Purchased:</span>
                  <span className="font-medium">{stats.giftsPurchased}</span>
                </div>
              </div>
              
              <Button variant="link" className="p-0 h-auto mt-2 text-sm" onClick={() => setSelectedTab('stats')}>
                View detailed stats
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {selectedTab === 'profile' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>My Profile</CardTitle>
                  <CardDescription>Manage your personal information</CardDescription>
                </div>
                {editMode ? (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCancelEdit} disabled={savingProfile}>
                      Cancel
                    </Button>
                    <Button data-testid="user-profile-save" onClick={handleSaveProfile} disabled={savingProfile}>
                      {savingProfile && <Loader2 size={16} className="mr-2 animate-spin" />}
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    data-testid="user-profile-edit-toggle"
                    variant="outline"
                    onClick={() => setEditMode(true)}
                    disabled={isLoadingProfile}
                  >
                    <Edit3 size={16} className="mr-2" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Profile Image Section */}
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-32 w-32">
                      <AvatarImage src={editMode ? editedProfile.avatar : profile.avatar} alt={profile.username} />
                      <AvatarFallback>{profile.firstName.charAt(0) + profile.lastName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {editMode && (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          id="avatar-file-input"
                          className="hidden"
                          onChange={(e) => handleAvatarFileSelected(e.target.files?.[0] ?? null)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUploadingAvatar}
                          onClick={() => document.getElementById('avatar-file-input')?.click()}
                        >
                          {isUploadingAvatar ? (
                            <>
                              <Loader2 size={14} className="mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            'Change Photo'
                          )}
                        </Button>
                      </>
                    )}
                    <div className="text-center mt-2">
                      <h3 className="font-medium text-lg">{profile.firstName} {profile.lastName}</h3>
                      <p className="text-sm text-muted-foreground">@{profile.username}</p>
                      <p className="text-xs text-muted-foreground mt-1">Member since {profile.joinDate}</p>
                    </div>
                  </div>
                  
                  {/* Profile Details */}
                  <div className="flex-1 space-y-4">
                    {editMode ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input 
                              data-testid="user-profile-first-name-input"
                              id="firstName" 
                              value={editedProfile.firstName}
                              onChange={e => setEditedProfile({...editedProfile, firstName: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input 
                              id="lastName" 
                              value={editedProfile.lastName}
                              onChange={e => setEditedProfile({...editedProfile, lastName: e.target.value})}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={editedProfile.email}
                            disabled
                          />
                          <p className="text-xs text-muted-foreground">
                            Changing your email isn't supported here yet — contact support if you need to update it.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input 
                            id="location" 
                            value={editedProfile.location}
                            onChange={e => setEditedProfile({...editedProfile, location: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea 
                            id="bio" 
                            value={editedProfile.bio}
                            onChange={e => setEditedProfile({...editedProfile, bio: e.target.value})}
                            rows={3}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Interests</Label>
                          <div className="flex flex-wrap gap-2">
                            {editedProfile.interests.map(interest => (
                              <div key={interest} className="flex items-center bg-muted rounded-full px-3 py-1">
                                <span className="text-sm">{interest}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5 ml-1" 
                                  onClick={() => removeInterest(interest)}
                                  aria-label={`Remove interest ${interest}`}
                                >
                                  <X size={12} aria-hidden="true" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex-1 min-w-[200px]">
                              <Input 
                                placeholder="Add interest..."
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    addInterest(e.currentTarget.value);
                                    e.currentTarget.value = '';
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium">Email</h3>
                          <p>{profile.email}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium">Location</h3>
                          <p>{profile.location}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium">Bio</h3>
                          <p>{profile.bio}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium">Interests</h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.interests.map(interest => (
                              <span key={interest} className="bg-muted rounded-full px-3 py-1 text-sm">
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Gift Preferences Tab */}
          {selectedTab === 'preferences' && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Gift Preferences</CardTitle>
                    <CardDescription>Customize your gifting experience</CardDescription>
                  </div>
                  {editMode ? (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleCancelEdit} disabled={savingProfile}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveProfile} disabled={savingProfile}>
                        {savingProfile && <Loader2 size={16} className="mr-2 animate-spin" />}
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setEditMode(true)}>
                      <Edit3 size={16} className="mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Clothing & Shoe Sizes */}
                  <div>
                    <h3 className="text-base font-medium mb-2">Sizes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clothing-size">Clothing Size</Label>
                        {editMode ? (
                          <select 
                            id="clothing-size"
                            className="w-full border rounded-md p-2"
                            value={editedProfile.giftPreferences.sizes.clothing}
                            onChange={e => updateGiftPreference('sizes', 'clothing', e.target.value)}
                            title="Select your clothing size"
                          >
                            {CLOTHING_SIZES.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm font-medium">{profile.giftPreferences.sizes.clothing}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shoe-size">Shoe Size</Label>
                        {editMode ? (
                          <select 
                            id="shoe-size"
                            className="w-full border rounded-md p-2"
                            value={editedProfile.giftPreferences.sizes.shoes}
                            onChange={e => updateGiftPreference('sizes', 'shoes', e.target.value)}
                            title="Select your shoe size"
                          >
                            {SHOE_SIZES.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm font-medium">{profile.giftPreferences.sizes.shoes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Color Preferences */}
                  <div>
                    <h3 className="text-base font-medium mb-2">Favorite Colors</h3>
                    {editMode ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {editedProfile.giftPreferences.colors.map(color => (
                            <div key={color} className="flex items-center bg-muted rounded-full px-3 py-1">
                              <span className="text-sm">{color}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 ml-1" 
                                onClick={() => removeGiftPreferenceItem('colors', color)}
                                aria-label={`Remove favorite color ${color}`}
                              >
                                <X size={12} aria-hidden="true" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex">
                          <Input 
                            placeholder="Add a color..."
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                updateGiftPreference('colors', '', e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="max-w-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.giftPreferences.colors.map(color => (
                          <span key={color} className="bg-muted rounded-full px-3 py-1 text-sm">
                            {color}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Not Interested In */}
                  <div>
                    <h3 className="text-base font-medium mb-2">Not Interested In</h3>
                    {editMode ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {editedProfile.giftPreferences.doNotWant.map(item => (
                            <div key={item} className="flex items-center bg-muted rounded-full px-3 py-1">
                              <span className="text-sm">{item}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 ml-1" 
                                onClick={() => removeGiftPreferenceItem('doNotWant', item)}
                                aria-label={`Remove uninterested item ${item}`}
                              >
                                <X size={12} aria-hidden="true" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex">
                          <Input 
                            placeholder="Add an item..."
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                updateGiftPreference('doNotWant', '', e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="max-w-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.giftPreferences.doNotWant.map(item => (
                          <span key={item} className="bg-muted rounded-full px-3 py-1 text-sm">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Gift Cards */}
                  <div>
                    <h3 className="text-base font-medium mb-2">Favorite Gift Cards</h3>
                    {editMode ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {editedProfile.giftPreferences.giftCards.map(card => (
                            <div key={card} className="flex items-center bg-muted rounded-full px-3 py-1">
                              <span className="text-sm">{card}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 ml-1" 
                                onClick={() => removeGiftPreferenceItem('giftCards', card)}
                                aria-label={`Remove gift card preference ${card}`}
                              >
                                <X size={12} aria-hidden="true" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex">
                          <Input 
                            placeholder="Add a gift card..."
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                updateGiftPreference('giftCards', '', e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="max-w-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.giftPreferences.giftCards.map(card => (
                          <span key={card} className="bg-muted rounded-full px-3 py-1 text-sm">
                            {card}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Favorite Stores */}
                  <div>
                    <h3 className="text-base font-medium mb-2">Favorite Stores</h3>
                    {editMode ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {editedProfile.favoriteStores.map(store => (
                            <div key={store} className="flex items-center bg-muted rounded-full px-3 py-1">
                              <span className="text-sm">{store}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 ml-1" 
                                onClick={() => removeFavoriteStore(store)}
                                aria-label={`Remove favorite store ${store}`}
                              >
                                <X size={12} aria-hidden="true" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex">
                          <Input 
                            placeholder="Add a store..."
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                addFavoriteStore(e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="max-w-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.favoriteStores.map(store => (
                          <span key={store} className="bg-muted rounded-full px-3 py-1 text-sm">
                            {store}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connections Tab */}
          {selectedTab === 'connections' && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Your Connections ({connections.length})</CardTitle>
                  <CardDescription>People you're connected with on Wishlist Wizard</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingConnections ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Loading connections...</p>
                  ) : connections.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-lg">
                      No connections yet. Find friends below to get started.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {connections.map(({ connectionId, user: connectionUser }) => {
                        const name = connectionDisplayName(connectionUser);
                        return (
                          <div key={connectionId} className="flex items-center space-x-3 border rounded-lg p-3" data-testid={`connection-${connectionId}`}>
                            <Avatar>
                              <AvatarImage src={connectionUser.photoURL || undefined} alt={name} />
                              <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{name}</p>
                              {connectionUser.username && connectionUser.displayName && (
                                <p className="text-xs text-muted-foreground truncate">@{connectionUser.username}</p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label={`Open actions for ${name}`}>
                                  <ChevronDown size={16} aria-hidden="true" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-red-600"
                                  disabled={removeConnectionMutation.isPending}
                                  onClick={() => removeConnectionMutation.mutate(connectionId)}
                                >
                                  Remove Connection
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {(incomingConnectionRequests.length > 0 || outgoingConnectionRequests.length > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Pending Requests</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {incomingConnectionRequests.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Incoming</h3>
                        {incomingConnectionRequests.map(({ connectionId, user: requestUser }) => {
                          const name = connectionDisplayName(requestUser);
                          return (
                            <div key={connectionId} className="flex items-center justify-between border rounded-lg p-3" data-testid={`incoming-request-${connectionId}`}>
                              <div className="flex items-center space-x-3 min-w-0">
                                <Avatar>
                                  <AvatarImage src={requestUser.photoURL || undefined} alt={name} />
                                  <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="font-medium truncate">{name}</p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  disabled={respondToConnectionMutation.isPending}
                                  onClick={() => respondToConnectionMutation.mutate({ connectionId, accept: true })}
                                >
                                  <Check size={14} className="mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={respondToConnectionMutation.isPending}
                                  onClick={() => respondToConnectionMutation.mutate({ connectionId, accept: false })}
                                >
                                  <X size={14} className="mr-1" />
                                  Decline
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {outgoingConnectionRequests.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Sent</h3>
                        {outgoingConnectionRequests.map(({ connectionId, user: requestUser }) => {
                          const name = connectionDisplayName(requestUser);
                          return (
                            <div key={connectionId} className="flex items-center justify-between border rounded-lg p-3" data-testid={`outgoing-request-${connectionId}`}>
                              <div className="flex items-center space-x-3 min-w-0">
                                <Avatar>
                                  <AvatarImage src={requestUser.photoURL || undefined} alt={name} />
                                  <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{name}</p>
                                  <p className="text-xs text-muted-foreground">Pending</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={removeConnectionMutation.isPending}
                                onClick={() => removeConnectionMutation.mutate(connectionId)}
                              >
                                Cancel
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Find Friends</CardTitle>
                  <CardDescription>Connect with friends to share wishlists, collaborate on gifts, and get gift suggestions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Tabs value={connectionFindMode} onValueChange={(value) => setConnectionFindMode(value as "search" | "contacts" | "email")}>
                    <TabsList className="w-full">
                      <TabsTrigger value="search" className="flex-1" data-testid="find-friends-mode-search">
                        Search by Name
                      </TabsTrigger>
                      <TabsTrigger value="contacts" className="flex-1" data-testid="find-friends-mode-contacts">
                        From Contacts
                      </TabsTrigger>
                      <TabsTrigger value="email" className="flex-1" data-testid="find-friends-mode-email">
                        By Email
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {connectionFindMode === 'search' ? (
                    <div className="space-y-1.5">
                      <Input
                        value={connectionSearchQuery}
                        onChange={(e) => setConnectionSearchQuery(e.target.value)}
                        placeholder="Type at least 2 characters..."
                        data-testid="find-friends-search-input"
                      />
                      <div className="max-h-56 overflow-y-auto space-y-1.5">
                        {debouncedConnectionSearchQuery.length < 2 ? null : isSearchingConnections ? (
                          <p className="py-3 text-center text-sm text-muted-foreground">Searching...</p>
                        ) : (connectionSearchResults?.users.filter((result) => result.id !== user?.uid).length ?? 0) === 0 ? (
                          <p className="py-3 text-center text-sm text-muted-foreground">No users found.</p>
                        ) : (
                          connectionSearchResults!.users
                            .filter((result) => result.id !== user?.uid)
                            .map((result) => (
                              <div key={result.id} className="flex items-center justify-between rounded-md border p-2" data-testid={`find-friends-result-${result.id}`}>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{result.displayName || result.username || "User"}</p>
                                  {result.username && <p className="truncate text-xs text-muted-foreground">@{result.username}</p>}
                                </div>
                                <Button size="sm" disabled={sendConnectionRequestMutation.isPending} onClick={() => requestConnectionByUser(result)}>
                                  <UserPlus size={14} className="mr-1" />
                                  Connect
                                </Button>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  ) : connectionFindMode === 'contacts' ? (
                    <div className="space-y-1.5" data-testid="find-friends-contacts-panel">
                      {isLoadingConnectionContacts ? (
                        <p className="py-3 text-center text-sm text-muted-foreground">Loading contacts...</p>
                      ) : connectedConnectionProviders.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No contact sources connected yet. Connect Google, Outlook, or Facebook in Calendar Settings to find friends from your contacts.
                        </p>
                      ) : connectionContacts.length === 0 ? (
                        <p className="py-3 text-center text-sm text-muted-foreground">No contacts found.</p>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-1.5">
                          {connectionContacts.map((contact) => (
                            <div key={contact.id} className="flex items-center justify-between rounded-md border p-2" data-testid={`find-friends-contact-${contact.id}`}>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{contact.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{contact.email || "No email available"}</p>
                              </div>
                              <Button
                                size="sm"
                                disabled={sendConnectionRequestMutation.isPending || !contact.email}
                                onClick={() => requestConnectionByContact(contact)}
                              >
                                <UserPlus size={14} className="mr-1" />
                                Connect
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Input
                        type="email"
                        value={connectionEmail}
                        onChange={(e) => setConnectionEmail(e.target.value)}
                        placeholder="name@example.com"
                        data-testid="find-friends-email-input"
                      />
                      <p className="text-xs text-muted-foreground">
                        If they don't have an account yet, they'll get a connection request once they sign up.
                      </p>
                      <Button
                        size="sm"
                        disabled={sendConnectionRequestMutation.isPending || !connectionEmail.trim()}
                        onClick={requestConnectionByEmail}
                        data-testid="find-friends-email-submit"
                      >
                        <Mail size={14} className="mr-1" />
                        Send Request
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Stats & Achievements Tab */}
          {selectedTab === 'stats' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Stats & Achievements</CardTitle>
                <CardDescription>Track your progress and milestones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats Section */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Activity Stats</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="bg-emerald-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <span className="text-3xl font-bold">{stats.itemsTracked}</span>
                          <p className="text-sm text-muted-foreground">Items Tracked</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-emerald-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <span className="text-3xl font-bold">{stats.wishlistsCreated}</span>
                          <p className="text-sm text-muted-foreground">Wishlists Created</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-emerald-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <span className="text-3xl font-bold">{stats.giftsPurchased}</span>
                          <p className="text-sm text-muted-foreground">Gifts Purchased</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                {/* Trophy Case */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium">Trophy Case</h3>
                    <Link href="/app/achievements" className="text-sm text-primary hover:underline">
                      How are achievements earned?
                    </Link>
                  </div>
                  {(() => {
                    const earnedAchievements = ACHIEVEMENT_DEFINITIONS.filter(
                      achievement => achievementsData?.achievements?.[achievement.id]?.earned
                    );
                    if (earnedAchievements.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground">
                          No achievements earned yet —{' '}
                          <Link href="/app/achievements" className="text-primary hover:underline">
                            see how to earn your first one
                          </Link>.
                        </p>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {earnedAchievements.map(achievement => {
                          const state = achievementsData?.achievements?.[achievement.id];
                          const tier = state?.tier ?? 0;
                          const tierName = tier > 0 ? ACHIEVEMENT_TIER_NAMES[tier - 1] : null;
                          const isWizard = achievement.tiered && tier === WIZARD_TIER;
                          return (
                            <div
                              key={achievement.id}
                              className={`border rounded-lg p-4 transition-colors ${
                                isWizard
                                  ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 ring-1 ring-amber-300 shadow-sm"
                                  : "bg-primary/5 border-primary/20"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="text-2xl">
                                  {isWizard ? "🧙" : achievement.icon}
                                </div>
                                <div>
                                  <h4 className="font-medium flex items-center gap-1.5">
                                    {achievement.name}
                                    <Check size={14} className="text-green-500" />
                                  </h4>
                                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                  {tierName && achievement.tiered && (
                                    <span
                                      className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${ACHIEVEMENT_TIER_BADGE_CLASSES[tier]}`}
                                    >
                                      {isWizard ? "✨ " : ""}{tierName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Recent Gift Exchanges */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Recent Gift Exchanges</h3>
                  <div className="space-y-3">
                    {profile.exchangeHistory.map(exchange => (
                      <div key={exchange.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={exchange.type === "Received" ? "text-emerald-700" : "text-green-600"}>
                              {exchange.type}
                            </span>
                            <span className="font-medium">{exchange.item}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {exchange.type === "Received" ? `From: ${exchange.from}` : `To: ${exchange.to}`}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(exchange.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
        </div>
      </div>
      </div>
    </>
  );
};

export default UserProfile;
