import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Database, Cloud } from "lucide-react";
import WishlistCard from "@/components/WishlistCard";
import CreateWishlistDialog from "@/components/CreateWishlistDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarAd } from "@/components/ads";
import { Wishlist as DbWishlist } from "@wishlist-wizard/shared";
import { useWishlists } from "@/hooks/useFirebaseData";

// Extended type for UI purposes that includes computed fields
type Wishlist = DbWishlist & {
  itemCount: number;
};

export default function Dashboard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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
    mutationFn: async (name: string) => {
      const res = await apiRequest('/api/wishlists', {
        method: 'POST',
        body: {
          name,
          userId: 1 // For demo purposes
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
    id: parseInt(wishlist.id) || 0, // Convert string ID to number for UI compatibility
    name: wishlist.name,
    userId: parseInt(wishlist.userId) || 0,
    createdAt: wishlist.createdAt,
    beneficiaryId: wishlist.beneficiaryId ? parseInt(wishlist.beneficiaryId) : null,
    shareId: wishlist.shareId || '',
    isPublic: wishlist.isPublic,
    isCollaborative: wishlist.isCollaborative,
    occasion: wishlist.occasion || null,
    occasionDate: wishlist.occasionDate || null,
    description: wishlist.description || null,
    itemCount: 0 // Will be populated separately in a real implementation
  })) as Wishlist[];

  // Determine which data source to use
  const wishlists = useFirebase ? convertedFirebaseWishlists : apiWishlists;
  const isLoading = useFirebase ? firebaseLoading : apiLoading;
  const error = useFirebase ? firebaseError : apiError;

  const handleCreateWishlist = async (name: string) => {
    try {
      if (useFirebase) {
        await createFirebaseWishlist({
          name,
          description: '',
          isPublic: false,
          isCollaborative: false
        });
        setIsCreateDialogOpen(false);
        toast({
          title: "Success!",
          description: "Wishlist created successfully with Firebase",
        });
      } else {
        createWishlistMutation.mutate(name);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create wishlist",
        variant: "destructive",
      });
    }
  };

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
              className="flex items-center space-x-2 bg-primary hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5" />
              <span>Create New List</span>
            </Button>
          </div>
          
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
                    className="bg-primary hover:bg-indigo-700"
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
                      <li>• Organize by occasions like birthdays</li>
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