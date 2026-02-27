import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useLocation } from "wouter";
import WishlistCard from "@/components/WishlistCard";
import CreateWishlistDialog from "@/components/CreateWishlistDialog";
import type { CreateWishlistFormValues } from "@/components/CreateWishlistDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getApiErrorMessage } from "@/lib/api-errors";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SidebarAd } from "@/components/ads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wishlist as DbWishlist } from "@wishlist-wizard/shared";

// Extended type for UI purposes that includes computed fields
type Wishlist = Omit<DbWishlist, 'id' | 'userId' | 'beneficiaryId'> & {
  id: string | number;
  userId: string | number;
  beneficiaryId?: string | number | null;
  itemCount: number;
};

const SELECTED_WISHLIST_STORAGE_KEY = 'dashboard.selectedWishlistId';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWishlistId, setSelectedWishlistId] = useState<string | number | null>(null);
  const { toast } = useToast();

  const toSelectionKey = (id: string | number) => String(id);

  // Fetch wishlists
  const { data: wishlists, isLoading, error } = useQuery<Wishlist[]>({
    queryKey: ['/api/wishlists'],
  });

  // Create wishlist mutation
  const createWishlistMutation = useMutation({
    mutationFn: async (wishlistData: CreateWishlistFormValues) => {
      const normalizedName = wishlistData.name.trim();
      if (!normalizedName) {
        throw new Error('Wishlist name is required');
      }

      const occasionDateIso = wishlistData.occasionDate
        ? new Date(`${wishlistData.occasionDate}T12:00:00`).toISOString()
        : null;

      const res = await apiRequest('/api/wishlists', {
        method: 'POST',
        body: {
          name: normalizedName,
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
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to create wishlist"),
        variant: "destructive",
      });
    }
  });

  const handleCreateWishlist = (wishlistData: CreateWishlistFormValues) => {
    createWishlistMutation.mutate(wishlistData);
  };

  useEffect(() => {
    if (!wishlists || wishlists.length === 0) {
      setSelectedWishlistId(null);
      try {
        localStorage.removeItem(SELECTED_WISHLIST_STORAGE_KEY);
      } catch {
        // Ignore localStorage errors in restricted environments
      }
      return;
    }

    const hasCurrentSelection =
      selectedWishlistId !== null &&
      wishlists.some((wishlist) => toSelectionKey(wishlist.id) === toSelectionKey(selectedWishlistId));
    if (hasCurrentSelection) {
      return;
    }

    let nextSelectedId: string | number = wishlists[0].id;
    try {
      const storedId = localStorage.getItem(SELECTED_WISHLIST_STORAGE_KEY);
      if (storedId) {
        const matchedWishlist = wishlists.find((wishlist) => toSelectionKey(wishlist.id) === storedId);
        if (matchedWishlist) {
          nextSelectedId = matchedWishlist.id;
        }
      }
    } catch {
      // Ignore localStorage errors in restricted environments
    }

    setSelectedWishlistId(nextSelectedId);
  }, [wishlists, selectedWishlistId]);

  useEffect(() => {
    if (selectedWishlistId === null) {
      return;
    }

    try {
      localStorage.setItem(SELECTED_WISHLIST_STORAGE_KEY, toSelectionKey(selectedWishlistId));
    } catch {
      // Ignore localStorage errors in restricted environments
    }
  }, [selectedWishlistId]);

  const selectedWishlist = wishlists?.find((wishlist) => wishlist.id === selectedWishlistId) ?? null;

  const formattedSelectedCreatedDate = selectedWishlist
    ? new Date(selectedWishlist.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const selectedEventDate = selectedWishlist?.occasionDate
    ? new Date(selectedWishlist.occasionDate)
    : null;
  const formattedSelectedEventDate = selectedEventDate && !Number.isNaN(selectedEventDate.getTime())
    ? selectedEventDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <>
      <main className="flex-1">
        <div data-testid="dashboard-page" className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h2 data-testid="dashboard-title" className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">My Wishlists</h2>
            <Button 
              data-testid="dashboard-create-wishlist"
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={createWishlistMutation.isPending}
              className="flex items-center space-x-2 bg-primary hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5" />
              <span>Create New List</span>
            </Button>
          </div>

          {selectedWishlist && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Selected Wishlist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedWishlist.name}</h3>
                  <p className="text-sm text-gray-500">Created {formattedSelectedCreatedDate}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                  <div><span className="text-gray-500">Items:</span> <span className="font-medium">{selectedWishlist.itemCount}</span></div>
                  <div><span className="text-gray-500">Event:</span> <span className="font-medium">{selectedWishlist.occasion || 'General'}</span></div>
                  <div><span className="text-gray-500">Event Date:</span> <span className="font-medium">{formattedSelectedEventDate || '—'}</span></div>
                  <div><span className="text-gray-500">Recurrence:</span> <span className="font-medium">{selectedWishlist.recurrence || 'none'}</span></div>
                  <div><span className="text-gray-500">Reminder:</span> <span className="font-medium">{selectedWishlist.reminderDays ?? '—'} days</span></div>
                </div>
                {selectedWishlist.description && (
                  <p className="text-sm text-gray-600">{selectedWishlist.description}</p>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => setLocation(`/wishlist/${selectedWishlist.id}`)}>Open Wishlist</Button>
                  <Button variant="outline" onClick={() => setLocation('/calendar')}>Plan on Calendar</Button>
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
                  <p className="text-red-500">Failed to load wishlists. Please try again.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/wishlists'] })}
                  >
                    Retry
                  </Button>
                </div>
              ) : wishlists && wishlists.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlists.map((wishlist) => (
                    <WishlistCard 
                      key={wishlist.id} 
                      wishlist={wishlist} 
                      selected={wishlist.id === selectedWishlistId}
                      onSelect={(selected) => setSelectedWishlistId(selected.id)}
                      onRefresh={() => queryClient.invalidateQueries({ queryKey: ['/api/wishlists'] })}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No wishlists yet</h3>
                  <p className="text-gray-500 mb-6">Create your first wishlist to get started</p>
                  <Button 
                    data-testid="dashboard-empty-create-wishlist"
                    onClick={() => setIsCreateDialogOpen(true)}
                    disabled={createWishlistMutation.isPending}
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
                <h3 className="font-medium text-lg mb-4">Tips</h3>
                <ul className="text-sm space-y-3">
                  <li>• Share wishlists with friends and family</li>
                  <li>• Add items from any online store</li>
                  <li>• Organize by events like birthdays</li>
                  <li>• Collaborate on gift ideas together</li>
                </ul>
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
        isPending={createWishlistMutation.isPending}
      />

    </>
  );
}
