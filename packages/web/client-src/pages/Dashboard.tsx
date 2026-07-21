import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LayoutGrid, List, CalendarDays, Plus, X } from "lucide-react";
import WishlistCard from "@/components/WishlistCard";
import WishlistListView from "@/components/WishlistListView";
import WishlistCalendarView from "@/components/WishlistCalendarView";
import CreateWishlistDialog from "@/components/CreateWishlistDialog";
import type { CreateWishlistFormValues } from "@/components/CreateWishlistDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getApiErrorMessage } from "@/lib/api-errors";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wishlist as DbWishlist } from "@wishlist-wizard/shared";

// Extended type for UI purposes that includes computed fields
type Wishlist = Omit<DbWishlist, 'id' | 'userId' | 'beneficiaryId'> & {
  id: string | number;
  userId: string | number;
  beneficiaryId?: string | number | null;
  recipient?: {
    type?: 'self' | 'person' | 'group';
    name?: string;
    members?: string[];
  } | null;
  recipientName?: string | null;
  itemCount: number;
};

type ViewMode = 'card' | 'list' | 'calendar';

const VIEW_MODE_STORAGE_KEY = 'dashboard.viewMode';
const GETTING_STARTED_DISMISSED_KEY = 'dashboard.gettingStartedDismissed';

function getInitialViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === 'card' || stored === 'list' || stored === 'calendar') {
      return stored;
    }
  } catch {
    // Ignore localStorage errors in restricted environments
  }
  return 'card';
}

function getInitialGettingStartedDismissed(): boolean {
  try {
    return localStorage.getItem(GETTING_STARTED_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function Dashboard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [gettingStartedDismissed, setGettingStartedDismissed] = useState(getInitialGettingStartedDismissed);
  const { toast } = useToast();

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
          recipientType: wishlistData.recipientType,
          recipientName: wishlistData.recipientName?.trim() || null,
          recipientMembers: wishlistData.recipientType === 'group'
            ? (wishlistData.recipientMembers || '').split(',').map((value) => value.trim()).filter(Boolean)
            : [],
          description: wishlistData.description?.trim() || '',
          isPublic: !!wishlistData.isPublic,
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

  const handleViewModeChange = (nextMode: string) => {
    const mode = nextMode as ViewMode;
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore localStorage errors in restricted environments
    }
  };

  const handleDismissGettingStarted = () => {
    setGettingStartedDismissed(true);
    try {
      localStorage.setItem(GETTING_STARTED_DISMISSED_KEY, 'true');
    } catch {
      // Ignore localStorage errors in restricted environments
    }
  };

  const isGettingStartedExpanded = (wishlists?.length ?? 0) === 0 ? true : !gettingStartedDismissed;

  return (
    <>
      <main className="flex-1">
        <div data-testid="dashboard-page" className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h1 data-testid="dashboard-title" className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">My Wishlists</h1>
            <Button
              data-testid="dashboard-create-wishlist"
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={createWishlistMutation.isPending}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-700 to-green-700 text-white hover:from-emerald-800 hover:to-green-800"
            >
              <Plus className="h-5 w-5" />
              <span>Create New List</span>
            </Button>
          </div>

          {isGettingStartedExpanded && (
            <Card className="mb-6 border-emerald-100" data-testid="dashboard-getting-started">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Getting Started</CardTitle>
                {(wishlists?.length ?? 0) > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDismissGettingStarted}
                        aria-label="Dismiss getting started tips"
                        data-testid="dashboard-getting-started-dismiss"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Dismiss getting started tips</TooltipContent>
                  </Tooltip>
                )}
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Share wishlists with friends and family to coordinate gifts</li>
                  <li>• Add items from any online store using the browser extension</li>
                  <li>• Add an occasion date and connect your calendar to stay ahead of birthdays and events</li>
                  <li>• Collaborate on gift ideas together</li>
                </ul>
              </CardContent>
            </Card>
          )}

          <Tabs value={viewMode} onValueChange={handleViewModeChange} className="mb-6">
            <TabsList data-testid="dashboard-view-mode-tabs">
              <TabsTrigger value="card" className="flex items-center gap-2" data-testid="dashboard-view-mode-card">
                <LayoutGrid className="h-4 w-4" />
                Card
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2" data-testid="dashboard-view-mode-list">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2" data-testid="dashboard-view-mode-calendar">
                <CalendarDays className="h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>

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
            viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlists.map((wishlist) => (
                  <WishlistCard
                    key={wishlist.id}
                    wishlist={wishlist}
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: ['/api/wishlists'] })}
                  />
                ))}
              </div>
            ) : viewMode === 'list' ? (
              <WishlistListView wishlists={wishlists} />
            ) : (
              <WishlistCalendarView wishlists={wishlists} />
            )
          ) : (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No wishlists yet</h3>
              <p className="text-gray-500 mb-6">Create your first wishlist to get started</p>
              <Button
                data-testid="dashboard-empty-create-wishlist"
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={createWishlistMutation.isPending}
                className="bg-gradient-to-r from-emerald-700 to-green-700 text-white hover:from-emerald-800 hover:to-green-800"
              >
                Create Wishlist
              </Button>
            </div>
          )}
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
