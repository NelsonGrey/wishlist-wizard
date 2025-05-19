import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WishlistCard from "@/components/WishlistCard";
import CreateWishlistDialog from "@/components/CreateWishlistDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SidebarAd } from "@/components/ads";

type Wishlist = {
  id: number;
  name: string;
  userId: number;
  shareId: string;
  createdAt: string;
  itemCount: number;
};

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch wishlists
  const { data: wishlists, isLoading, error } = useQuery<Wishlist[]>({
    queryKey: ['/api/wishlists'],
  });

  // Create wishlist mutation
  const createWishlistMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/wishlists', {
        name,
        userId: 1 // For demo purposes
      });
      return res.json();
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
        description: "Failed to create wishlist",
        variant: "destructive",
      });
    }
  });

  const handleCreateWishlist = (name: string) => {
    createWishlistMutation.mutate(name);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">My Wishlists</h2>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="flex items-center space-x-2 bg-primary hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5" />
              <span>Create New List</span>
            </Button>
          </div>
          
          {/* Dashboard layout with sidebar ad */}
          <div className="flex flex-col lg:flex-row gap-6">

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
      </main>

      <CreateWishlistDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreateWishlist={handleCreateWishlist}
        isPending={createWishlistMutation.isPending}
      />
      
      <Footer />
    </div>
  );
}
