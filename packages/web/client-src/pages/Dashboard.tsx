import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import WishlistCard from "@/components/WishlistCard";
import CreateWishlistDialog from "@/components/CreateWishlistDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SidebarAd } from "@/components/ads";
import { Wishlist as DbWishlist } from "@wishlist-wizard/shared";

// Extended type for UI purposes that includes computed fields
type Wishlist = DbWishlist & {
  itemCount: number;
};

export default function Dashboard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch wishlists
  const { data: wishlists, isLoading, error } = useQuery<Wishlist[]>({
    queryKey: ['/api/wishlists'],
  });

  // Create wishlist mutation
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

  const handleCreateWishlist = (name: string) => {
    createWishlistMutation.mutate(name);
  };

  return (
    <>
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
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
                      onRefresh={() => queryClient.invalidateQueries({ queryKey: ['/api/wishlists'] })}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No wishlists yet</h3>
                  <p className="text-gray-500 mb-6">Create your first wishlist to get started</p>
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
                <h3 className="font-medium text-lg mb-4">Tips</h3>
                <ul className="text-sm space-y-3">
                  <li>• Share wishlists with friends and family</li>
                  <li>• Add items from any online store</li>
                  <li>• Organize by occasions like birthdays</li>
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
