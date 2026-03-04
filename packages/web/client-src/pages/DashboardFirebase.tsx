import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Database, Cloud } from "lucide-react";
import WishlistCard from "@/components/WishlistCard";
import CreateWishlistDialog from "@/components/CreateWishlistDialog";
import type { CreateWishlistFormValues } from "@/components/CreateWishlistDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarAd } from "@/components/ads";
import { Wishlist as DbWishlist } from "@wishlist-wizard/shared";
import { useWishlists } from "@/hooks/useFirebaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Extended type for UI purposes that includes computed fields
type Wishlist = Omit<DbWishlist, 'id' | 'userId' | 'beneficiaryId'> & {
  id: string | number;
  userId: string | number;
  beneficiaryId?: string | number | null;
  itemCount: number;
};

type RecurringWishlist = Wishlist & {
  nextOccurrenceDate: Date;
};

const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

const parseOccasionDate = (wishlist: Wishlist): Date | null => {
  if (!wishlist.occasionDate) return null;
  if (wishlist.occasionDate instanceof Date) return wishlist.occasionDate;
  const parsed = new Date(wishlist.occasionDate as unknown as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateNextOccurrence = (baseDate: Date, recurrence?: string | null): Date => {
  if (recurrence !== 'yearly' && recurrence !== 'monthly') {
    return baseDate;
  }

  const now = new Date();
  const next = new Date(baseDate);
  if (recurrence === 'yearly') {
    next.setFullYear(now.getFullYear());
    if (next < now) {
      next.setFullYear(now.getFullYear() + 1);
    }
  } else {
    next.setFullYear(now.getFullYear(), now.getMonth());
    if (next < now) {
      next.setMonth(now.getMonth() + 1);
    }
  }
  return next;
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWishlistId, setSelectedWishlistId] = useState<string | number | null>(null);
  const [useFirebase, setUseFirebase] = useState(
    import.meta.env.VITE_USE_FIREBASE_SDK === 'true'
  );
  const { toast } = useToast();

  // Firebase-based data fetching
  const {
    wishlists: firebaseWishlists,
    loading: firebaseLoading,
    error: firebaseError,
    createWishlist: createFirebaseWishlist
  } = useWishlists();

  // Traditional API-based data fetching
  const { 
    data: apiWishlists, 
    isLoading: apiLoading, 
    error: apiError 
  } = useQuery<Wishlist[]>({
    queryKey: ['/api/wishlists'],
    enabled: !useFirebase // Only fetch when not using Firebase
  });

  // API-based create wishlist mutation
  const createWishlistMutation = useMutation({
    mutationFn: async (wishlistData: CreateWishlistFormValues) => {
      const occasionDateIso = wishlistData.occasionDate
        ? new Date(`${wishlistData.occasionDate}T12:00:00`).toISOString()
        : null;

      const res = await apiRequest('/api/wishlists', {
        method: 'POST',
        body: {
          name: wishlistData.name,
          description: wishlistData.description?.trim() || '',
          occasion: wishlistData.occasion?.trim() || null,
          occasionDate: occasionDateIso,
          recurrence: wishlistData.isRecurring ? wishlistData.recurrence : 'none',
          reminderDays: wishlistData.isRecurring ? wishlistData.reminderDays : null,
        }
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlists'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success!",
        description: "Wishlist created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create wishlist",
        variant: "destructive",
      });
    }
  });

  // Convert Firebase wishlists to match API format for UI compatibility
  const convertedFirebaseWishlists = firebaseWishlists?.map(wishlist => ({
    id: wishlist.id,
    name: wishlist.name,
    userId: wishlist.userId,
    createdAt: wishlist.createdAt,
    beneficiaryId: wishlist.beneficiaryId ?? null,
    shareId: wishlist.shareId || '',
    isPublic: wishlist.isPublic,
    isCollaborative: wishlist.isCollaborative,
    occasion: wishlist.occasion || null,
    occasionDate: wishlist.occasionDate || null,
    recurrence: wishlist.recurrence || null,
    reminderDays: typeof wishlist.reminderDays === 'number' ? wishlist.reminderDays : null,
    description: wishlist.description || null,
    itemCount: 0 // Will be populated separately in a real implementation
  })) as Wishlist[];

  // Determine which data source to use
  const wishlists = useFirebase ? convertedFirebaseWishlists : apiWishlists;
  const isLoading = useFirebase ? firebaseLoading : apiLoading;
  const error = useFirebase ? firebaseError : apiError;

  const handleCreateWishlist = async (wishlistData: CreateWishlistFormValues) => {
    const occasionDateValue = wishlistData.occasionDate
      ? new Date(`${wishlistData.occasionDate}T12:00:00`)
      : undefined;

    try {
      if (useFirebase) {
        await createFirebaseWishlist({
          name: wishlistData.name,
          description: wishlistData.description?.trim() || '',
          isPublic: false,
          isCollaborative: false,
          occasion: wishlistData.occasion?.trim() || undefined,
          occasionDate: occasionDateValue,
          recurrence: wishlistData.isRecurring ? wishlistData.recurrence : 'none',
          reminderDays: wishlistData.isRecurring ? wishlistData.reminderDays : undefined,
        });
        setIsCreateDialogOpen(false);
        toast({
          title: "Success!",
          description: "Wishlist created successfully with Firebase",
        });
      } else {
        createWishlistMutation.mutate(wishlistData);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create wishlist",
        variant: "destructive",
      });
    }
  };


  const recurringWishlists: RecurringWishlist[] = (wishlists || [])
    .filter((wishlist): wishlist is Wishlist => Boolean(wishlist))
    .map((wishlist) => {
      const occasionDate = parseOccasionDate(wishlist);
      if (!occasionDate || !wishlist.recurrence || wishlist.recurrence === 'none') {
        return null;
      }

      return {
        ...wishlist,
        nextOccurrenceDate: calculateNextOccurrence(occasionDate, wishlist.recurrence),
      };
    })
    .filter((wishlist): wishlist is RecurringWishlist => wishlist !== null)
    .sort((a, b) => a.nextOccurrenceDate.getTime() - b.nextOccurrenceDate.getTime());

  useEffect(() => {
    if (!wishlists || wishlists.length === 0) {
      setSelectedWishlistId(null);
      return;
    }

    if (selectedWishlistId === null || !wishlists.some((wishlist) => wishlist.id === selectedWishlistId)) {
      setSelectedWishlistId(wishlists[0].id);
    }
  }, [wishlists, selectedWishlistId]);

  const selectedWishlist = wishlists?.find((wishlist) => wishlist.id === selectedWishlistId) ?? null;
  const selectedCreatedAt = selectedWishlist
    ? new Date(selectedWishlist.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';
  const selectedEventDate = selectedWishlist ? parseOccasionDate(selectedWishlist) : null;
  const selectedEventDateLabel = selectedEventDate ? formatDate(selectedEventDate) : '—';

  const toggleDataSource = () => {
    setUseFirebase(!useFirebase);
    toast({
      title: `Switched to ${!useFirebase ? 'Firebase SDK' : 'API Server'}`,
      description: `Now using ${!useFirebase ? 'direct Firestore access with real-time updates' : 'REST API calls'}`,
    });
  };

  return (
    <>
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Data Source Toggle */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Data Source:</span>
                  {useFirebase ? (
                    <Badge variant="default" className="bg-orange-500">
                      <Cloud className="h-3 w-3 mr-1" />
                      Firebase SDK
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Database className="h-3 w-3 mr-1" />
                      API Server
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {useFirebase 
                    ? 'Direct Firestore • Real-time updates • Offline support'
                    : 'REST API • HTTP requests • Traditional architecture'
                  }
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDataSource}
                className="text-xs"
              >
                Switch to {useFirebase ? 'API Server' : 'Firebase SDK'}
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">My Wishlists</h2>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-700 to-green-700 text-white hover:from-emerald-800 hover:to-green-800"
            >
              <Plus className="h-5 w-5" />
              <span>Create New List</span>
            </Button>
          </div>

          {recurringWishlists.length > 0 && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Recurring Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recurringWishlists.slice(0, 5).map((wishlist) => (
                    <div key={`recurring-${wishlist.id}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <p className="font-medium text-gray-900">{wishlist.occasion || wishlist.name}</p>
                        <p className="text-sm text-gray-500">
                          Next {wishlist.recurrence} event: {formatDate(wishlist.nextOccurrenceDate)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/app/wishlist/${wishlist.id}`)}
                      >
                        Manage Current
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedWishlist && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Selected Wishlist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedWishlist.name}</h3>
                  <p className="text-sm text-gray-500">Created {selectedCreatedAt}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                  <div><span className="text-gray-500">Items:</span> <span className="font-medium">{selectedWishlist.itemCount}</span></div>
                  <div><span className="text-gray-500">Event:</span> <span className="font-medium">{selectedWishlist.occasion || 'General'}</span></div>
                  <div><span className="text-gray-500">Event Date:</span> <span className="font-medium">{selectedEventDateLabel}</span></div>
                  <div><span className="text-gray-500">Recurrence:</span> <span className="font-medium">{selectedWishlist.recurrence || 'none'}</span></div>
                  <div><span className="text-gray-500">Reminder:</span> <span className="font-medium">{selectedWishlist.reminderDays ?? '—'} days</span></div>
                </div>
                {selectedWishlist.description && (
                  <p className="text-sm text-gray-600">{selectedWishlist.description}</p>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => setLocation(`/app/wishlist/${selectedWishlist.id}`)}>Open Wishlist</Button>
                  <Button variant="outline" onClick={() => setLocation('/app/calendar')}>Plan on Calendar</Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Dashboard layout with content and sidebar */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main content area */}
            <div className="flex-1">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border p-5 h-64 animate-pulse">
                      <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
                      <div className="space-y-3">
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500">
                    Failed to load wishlists. Please try again.
                    {useFirebase && (
                      <span className="block text-sm mt-2">
                        Make sure Firebase is properly configured.
                      </span>
                    )}
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      if (useFirebase) {
                        // Firebase data will auto-refresh via subscription
                        window.location.reload();
                      } else {
                        queryClient.invalidateQueries({ queryKey: ['/api/wishlists'] });
                      }
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : wishlists && wishlists.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlists.map((wishlist) => (
                    <div key={wishlist.id} className="relative">
                      <WishlistCard 
                        wishlist={wishlist} 
                        selected={wishlist.id === selectedWishlistId}
                        onSelect={(selected) => setSelectedWishlistId(selected.id)}
                        onRefresh={() => {
                          if (!useFirebase) {
                            queryClient.invalidateQueries({ queryKey: ['/api/wishlists'] });
                          }
                          // Firebase data refreshes automatically via real-time subscription
                        }}
                      />
                      {useFirebase && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                            Real-time
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No wishlists yet</h3>
                  <p className="text-gray-500 mb-6">
                    Create your first wishlist to get started
                    {useFirebase && (
                      <span className="block text-sm mt-2 text-orange-600">
                        ✨ Using Firebase for real-time updates!
                      </span>
                    )}
                  </p>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-gradient-to-r from-emerald-700 to-green-700 text-white hover:from-emerald-800 hover:to-green-800"
                  >
                    Create Wishlist
                  </Button>
                </div>
              )}
            </div>
            
            {/* Sidebar with ad */}
            <div className="w-full lg:w-64 mt-8 lg:mt-0">
              <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                <h3 className="font-medium text-lg mb-4">
                  {useFirebase ? 'Firebase Features' : 'API Features'}
                </h3>
                <ul className="text-sm space-y-3">
                  {useFirebase ? (
                    <>
                      <li>• Real-time updates across devices</li>
                      <li>• Offline support & sync</li>
                      <li>• Direct Firestore queries</li>
                      <li>• Optimistic UI updates</li>
                    </>
                  ) : (
                    <>
                      <li>• Share wishlists with friends and family</li>
                      <li>• Add items from any online store</li>
                      <li>• Organize by events like birthdays</li>
                      <li>• Collaborate on gift ideas together</li>
                    </>
                  )}
                </ul>
              </div>
              
              {/* Migration Status */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200 mb-6">
                <h4 className="font-medium text-emerald-900 mb-2">Migration Status</h4>
                <div className="text-xs text-emerald-800 space-y-1">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Database: Firestore ✓
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Auth: Firebase Auth ✓
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    SDK: Hybrid Mode
                  </div>
                </div>
              </div>
              
              {/* Ad placement */}
              <SidebarAd />
            </div>
          </div>
        </div>
      </main>

      <CreateWishlistDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreateWishlist={handleCreateWishlist}
        isPending={useFirebase ? false : createWishlistMutation.isPending}
      />

    </>
  );
}