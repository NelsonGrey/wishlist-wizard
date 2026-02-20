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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  User,
  Settings,
  Bell,
  Gift,
  HeartHandshake,
  Lock,
  Mail,
  Check,
  ShieldCheck,
  History,
  LogOut,
  ChevronDown,
  BadgeDollarSign,
  Edit3,
  Save,
  CreditCard,
  BarChart3,
  Loader2,
  X,
  UserPlus,
  Receipt
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const createInitialProfile = (user?: {
  uid?: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}) => ({
  id: user?.uid ? Number.parseInt(user.uid, 10) || 0 : 0,
  username: user?.email?.split('@')[0] || "",
  firstName: user?.displayName?.split(' ')[0] || "",
  lastName: user?.displayName?.split(' ').slice(1).join(' ') || "",
  email: user?.email || "",
  avatar: user?.photoURL || "",
  bio: "",
  location: "",
  joinDate: "",
  interests: [] as string[],
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
      clothing: "Medium",
      shoes: "US 8"
    },
    colors: [] as string[],
    doNotWant: [] as string[],
    giftCards: [] as string[]
  },
  stats: {
    itemsTracked: 0,
    wishlistsCreated: 0,
    giftsPurchased: 0,
    totalSavings: 0,
    averageRating: 0,
    daysActive: 0
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
  favoriteStores: [] as string[]
});

// Theme options
const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System Default" }
];

// Language options
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English (US)" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" }
];

// Currency options
const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CAD", label: "CAD ($)" }
];

// Common clothing sizes
const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

// Common shoe sizes (US)
const SHOE_SIZES = ["US 5", "US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12", "US 13"];

// Achievement badges data
const ACHIEVEMENTS = [
  { id: 1, name: "Wishlist Wizard", description: "Created 10+ wishlists", earned: true, icon: "🌟" },
  { id: 2, name: "Gifting Guru", description: "Purchased 25+ gifts", earned: true, icon: "🎁" },
  { id: 3, name: "Savings Expert", description: "Saved over $250 with price tracking", earned: true, icon: "💰" },
  { id: 4, name: "Social Butterfly", description: "Connected with 20+ friends", earned: false, icon: "🦋" },
  { id: 5, name: "Review Enthusiast", description: "Wrote 15+ product reviews", earned: false, icon: "✍️" }
];

const CONNECTIONS: Array<{ id: number; name: string; avatar: string; mutualFriends: number }> = [];

const UserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(() => createInitialProfile(user || undefined));
  const [selectedTab, setSelectedTab] = useState("profile");
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState(() => createInitialProfile(user || undefined));
  const [savingProfile, setSavingProfile] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || editMode) {
      return;
    }

    const mergedProfile = {
      ...profile,
      username: user.email?.split('@')[0] || profile.username,
      firstName: user.displayName?.split(' ')[0] || profile.firstName,
      lastName: user.displayName?.split(' ').slice(1).join(' ') || profile.lastName,
      email: user.email || profile.email,
      avatar: user.photoURL || profile.avatar,
    };

    setProfile(mergedProfile);
    setEditedProfile(mergedProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.email, user?.displayName, user?.photoURL, editMode]);

  // Update profile settings
  const { mutate: updateProfile } = useMutation({
    mutationFn: async (updatedProfile: typeof profile) => {
      // Simulate API call to update profile
      setSavingProfile(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSavingProfile(false);
      return updatedProfile;
    },
    onSuccess: (data) => {
      setProfile(data);
      setEditMode(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
        duration: 3000
      });
    }
  });

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

  // Toggle notification settings
  const toggleNotification = (key: keyof typeof profile.notifications) => {
    setEditedProfile({
      ...editedProfile,
      notifications: {
        ...editedProfile.notifications,
        [key]: !editedProfile.notifications[key]
      }
    });
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent mb-8">Profile & Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <nav className="flex flex-col">
                <button 
                  className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === 'profile' ? 'bg-muted font-medium' : ''}`}
                  onClick={() => setSelectedTab('profile')}
                >
                  <User size={18} />
                  <span>Profile</span>
                </button>
                <button 
                  className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === 'preferences' ? 'bg-muted font-medium' : ''}`}
                  onClick={() => setSelectedTab('preferences')}
                >
                  <Gift size={18} />
                  <span>Gift Preferences</span>
                </button>
                <button 
                  className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === 'notifications' ? 'bg-muted font-medium' : ''}`}
                  onClick={() => setSelectedTab('notifications')}
                >
                  <Bell size={18} />
                  <span>Notifications</span>
                </button>
                <button 
                  className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === 'privacy' ? 'bg-muted font-medium' : ''}`}
                  onClick={() => setSelectedTab('privacy')}
                >
                  <Lock size={18} />
                  <span>Privacy</span>
                </button>
                <button 
                  className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === 'connections' ? 'bg-muted font-medium' : ''}`}
                  onClick={() => setSelectedTab('connections')}
                >
                  <HeartHandshake size={18} />
                  <span>Connections</span>
                </button>
                <button 
                  className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === 'stats' ? 'bg-muted font-medium' : ''}`}
                  onClick={() => setSelectedTab('stats')}
                >
                  <BarChart3 size={18} />
                  <span>Stats & Achievements</span>
                </button>
                <button 
                  className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === 'settings' ? 'bg-muted font-medium' : ''}`}
                  onClick={() => setSelectedTab('settings')}
                >
                  <Settings size={18} />
                  <span>Account Settings</span>
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
                  <span className="font-medium">{profile.stats.itemsTracked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wishlists Created:</span>
                  <span className="font-medium">{profile.stats.wishlistsCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gifts Purchased:</span>
                  <span className="font-medium">{profile.stats.giftsPurchased}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Savings:</span>
                  <span className="font-medium text-green-600">${profile.stats.totalSavings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Rating:</span>
                  <span className="font-medium">{profile.stats.averageRating} / 5</span>
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
                <Button 
                  variant={editMode ? "default" : "outline"} 
                  onClick={() => setEditMode(!editMode)}
                  disabled={savingProfile}
                >
                  {editMode ? (
                    <>
                      <Save size={16} className="mr-2" />
                      Done Editing
                    </>
                  ) : (
                    <>
                      <Edit3 size={16} className="mr-2" />
                      Edit Profile
                    </>
                  )}
                </Button>
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
                      <Button variant="outline" size="sm">Change Photo</Button>
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
                            onChange={e => setEditedProfile({...editedProfile, email: e.target.value})}
                          />
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
                                >
                                  <X size={12} />
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
                        
                        <div className="pt-4 flex gap-2">
                          <Button onClick={handleSaveProfile} disabled={savingProfile}>
                            {savingProfile && <Loader2 size={16} className="mr-2 animate-spin" />}
                            Save Changes
                          </Button>
                          <Button variant="outline" onClick={handleCancelEdit} disabled={savingProfile}>
                            Cancel
                          </Button>
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
                  <Button 
                    variant={editMode ? "default" : "outline"} 
                    onClick={() => setEditMode(!editMode)}
                    disabled={savingProfile}
                  >
                    {editMode ? (
                      <>
                        <Save size={16} className="mr-2" />
                        Done
                      </>
                    ) : (
                      <>
                        <Edit3 size={16} className="mr-2" />
                        Edit
                      </>
                    )}
                  </Button>
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
                              >
                                <X size={12} />
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
                              >
                                <X size={12} />
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
                              >
                                <X size={12} />
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
                              >
                                <X size={12} />
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
                  
                  {editMode && (
                    <div className="pt-4 flex gap-2">
                      <Button onClick={handleSaveProfile} disabled={savingProfile}>
                        {savingProfile && <Loader2 size={16} className="mr-2 animate-spin" />}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit} disabled={savingProfile}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Notifications Tab */}
          {selectedTab === 'notifications' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how and when we contact you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-notifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive updates via email</p>
                      </div>
                      <Switch 
                        id="email-notifications" 
                        checked={editedProfile.notifications.email}
                        onCheckedChange={() => toggleNotification('email')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="push-notifications">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
                      </div>
                      <Switch 
                        id="push-notifications" 
                        checked={editedProfile.notifications.push}
                        onCheckedChange={() => toggleNotification('push')}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="price-alerts">Price Drop Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified when item prices drop</p>
                      </div>
                      <Switch 
                        id="price-alerts" 
                        checked={editedProfile.notifications.priceAlerts}
                        onCheckedChange={() => toggleNotification('priceAlerts')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="gift-reminders">Gift Reminders</Label>
                        <p className="text-sm text-muted-foreground">Receive reminders for upcoming gift occasions</p>
                      </div>
                      <Switch 
                        id="gift-reminders" 
                        checked={editedProfile.notifications.giftReminders}
                        onCheckedChange={() => toggleNotification('giftReminders')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="wishlist-updates">Wishlist Updates</Label>
                        <p className="text-sm text-muted-foreground">Notifications when your wishlists are viewed or items are purchased</p>
                      </div>
                      <Switch 
                        id="wishlist-updates" 
                        checked={editedProfile.notifications.wishlistUpdates}
                        onCheckedChange={() => toggleNotification('wishlistUpdates')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="special-offers">Special Offers & Tips</Label>
                        <p className="text-sm text-muted-foreground">Receive exclusive deals and gifting advice</p>
                      </div>
                      <Switch 
                        id="special-offers" 
                        checked={editedProfile.notifications.specialOffers}
                        onCheckedChange={() => toggleNotification('specialOffers')}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={handleSaveProfile} disabled={savingProfile}>
                      {savingProfile && <Loader2 size={16} className="mr-2 animate-spin" />}
                      Save Notification Preferences
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Privacy Tab */}
          {selectedTab === 'privacy' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Manage who can see your wishlists and activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Advanced Privacy Controls</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Manage detailed privacy settings for individual wishlists, items, and your profile.
                    Control visibility, custom access lists, and interaction permissions.
                  </p>
                  <Button asChild size="lg">
                    <Link href="/privacy-settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Open Privacy Settings
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Connections Tab */}
          {selectedTab === 'connections' && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <div>
                    <CardTitle>Friends & Connections</CardTitle>
                    <CardDescription>Manage your network</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setShowConnections(!showConnections)}>
                    {showConnections ? "Hide Friends" : "Show All Friends"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showConnections ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-medium">Your Friends ({CONNECTIONS.length})</h3>
                        <Button size="sm" variant="outline">
                          <UserPlus size={16} className="mr-2" />
                          Add Friend
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        {CONNECTIONS.map(friend => (
                          <div key={friend.id} className="flex items-center space-x-3 border rounded-lg p-3">
                            <Avatar>
                              <AvatarImage src={friend.avatar} alt={friend.name} />
                              <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{friend.name}</p>
                              <p className="text-xs text-muted-foreground">{friend.mutualFriends} mutual friends</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <ChevronDown size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Profile</DropdownMenuItem>
                                <DropdownMenuItem>View Wishlists</DropdownMenuItem>
                                <DropdownMenuItem>Send Message</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">Remove Friend</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-base font-medium">Pending Requests</h3>
                      <div className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-lg">
                        No pending friend requests
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-base font-medium">Find Friends</h3>
                      <div className="flex gap-2">
                        <Input placeholder="Search by name or email" className="flex-1" />
                        <Button variant="outline">Search</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Button variant="outline" size="sm">
                          <Mail size={14} className="mr-1" />
                          Invite via Email
                        </Button>
                        <Button variant="outline" size="sm" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                          Import from Facebook
                        </Button>
                        <Button variant="outline" size="sm" className="bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200">
                          Import from Contacts
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm">Connect with friends to share wishlists, collaborate on gifts, and get gift suggestions.</p>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      {CONNECTIONS.slice(0, 3).map(friend => (
                        <div key={friend.id} className="flex items-center space-x-3 border rounded-lg p-3 flex-1">
                          <Avatar>
                            <AvatarImage src={friend.avatar} alt={friend.name} />
                            <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{friend.name}</p>
                            <p className="text-xs text-muted-foreground">{friend.mutualFriends} mutual friends</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4">
                      <Button variant="outline" size="sm" onClick={() => setShowConnections(true)}>
                        Show All Friends
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
                          <span className="text-3xl font-bold">{profile.stats.itemsTracked}</span>
                          <p className="text-sm text-muted-foreground">Items Tracked</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-emerald-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <span className="text-3xl font-bold">{profile.stats.wishlistsCreated}</span>
                          <p className="text-sm text-muted-foreground">Wishlists Created</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-emerald-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <span className="text-3xl font-bold">{profile.stats.giftsPurchased}</span>
                          <p className="text-sm text-muted-foreground">Gifts Purchased</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-green-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <span className="text-3xl font-bold text-green-600">${profile.stats.totalSavings.toFixed(2)}</span>
                          <p className="text-sm text-muted-foreground">Total Savings</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-primary/5">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <span className="text-3xl font-bold">{profile.stats.averageRating}</span>
                          <p className="text-sm text-muted-foreground">Average Rating</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-primary/5">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <span className="text-3xl font-bold">{profile.stats.daysActive}</span>
                          <p className="text-sm text-muted-foreground">Days Active</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                {/* Achievement Badges */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Achievement Badges</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {ACHIEVEMENTS.map(achievement => (
                      <div 
                        key={achievement.id} 
                        className={`border rounded-lg p-4 transition-colors ${achievement.earned ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 opacity-60'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`text-2xl ${achievement.earned ? '' : 'grayscale'}`}>
                            {achievement.icon}
                          </div>
                          <div>
                            <h4 className="font-medium flex items-center">
                              {achievement.name}
                              {achievement.earned && (
                                <Check size={14} className="ml-1 text-green-500" />
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Recent Gift Exchanges */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Recent Gift Exchanges</h3>
                  <div className="space-y-3">
                    {profile.exchangeHistory.map(exchange => (
                      <div key={exchange.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={exchange.type === "Received" ? "text-blue-600" : "text-green-600"}>
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
          
          {/* Account Settings Tab */}
          {selectedTab === 'settings' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Appearance */}
                <div className="space-y-2">
                  <h3 className="text-base font-medium">Appearance</h3>
                  <div className="flex flex-col space-y-1">
                    <Label htmlFor="theme-select">Theme</Label>
                    <select 
                      id="theme-select" 
                      className="border rounded-md p-2"
                      value={editedProfile.theme}
                      onChange={e => setEditedProfile({...editedProfile, theme: e.target.value})}
                      title="Select your preferred theme"
                    >
                      {THEME_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Regional Settings */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Regional Settings</h3>
                  
                  <div className="flex flex-col space-y-1">
                    <Label htmlFor="language-select">Language</Label>
                    <select 
                      id="language-select" 
                      className="border rounded-md p-2"
                      value={editedProfile.language}
                      onChange={e => setEditedProfile({...editedProfile, language: e.target.value})}
                      title="Select your preferred language"
                    >
                      {LANGUAGE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <Label htmlFor="currency-select">Currency</Label>
                    <select 
                      id="currency-select" 
                      className="border rounded-md p-2"
                      value={editedProfile.currency}
                      onChange={e => setEditedProfile({...editedProfile, currency: e.target.value})}
                      title="Select your preferred currency"
                    >
                      {CURRENCY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Payment Methods */}
                <div className="space-y-3">
                  <h3 className="text-base font-medium">Payment Methods</h3>
                  
                  <div className="space-y-2">
                    {profile.paymentMethods.map(method => (
                      <div key={method.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div>
                            {method.type === 'credit_card' ? (
                              <CreditCard className="text-primary" />
                            ) : (
                              <BadgeDollarSign className="text-emerald-800" />
                            )}
                          </div>
                          <div>
                            {method.type === 'credit_card' ? (
                              <div>
                                <p className="font-medium">{method.brand} ••••{method.lastFour}</p>
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium">PayPal</p>
                                <p className="text-sm text-muted-foreground">{method.email}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          {method.default && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <Button variant="outline" size="sm">
                      <CreditCard size={16} className="mr-2" />
                      Add Payment Method
                    </Button>
                  </div>
                </div>

                {/* Payment History */}
                <div className="space-y-3">
                  <h3 className="text-base font-medium">Payment History</h3>

                  <div className="space-y-2">
                    {/* This would be populated with actual payment history data */}
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No payment history available</p>
                      <p className="text-xs mt-1">Your contribution and purchase history will appear here</p>
                    </div>
                  </div>
                </div>
                
                {/* Security */}
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
                
                {/* Account Actions */}
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
                
                <div className="pt-4">
                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile && <Loader2 size={16} className="mr-2 animate-spin" />}
                    Save Account Settings
                  </Button>
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
