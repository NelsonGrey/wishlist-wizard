import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Clipboard, Check, Share2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WishlistItem from "@/components/WishlistItem";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wishlist as DbWishlist, WishlistItem as DbWishlistItem } from "@wishlist-wizard/shared";

type Wishlist = DbWishlist;
type WishlistItem = DbWishlistItem;

export default function WishlistDetail() {
  const [match, params] = useRoute('/wishlist/:id');
  const [location, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const id = match ? parseInt(params.id) : -1;

  // Fetch wishlist details
  const { data: wishlist, isLoading: isLoadingWishlist } = useQuery<Wishlist>({
    queryKey: [`/api/wishlists/${id}`],
    enabled: id > 0,
  });

  // Fetch wishlist items
  const { 
    data: items, 
    isLoading: isLoadingItems, 
    error 
  } = useQuery<WishlistItem[]>({
    queryKey: [`/api/wishlists/${id}/items`],
    enabled: id > 0,
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await apiRequest(`/api/items/${itemId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${id}/items`] });
      toast({
        title: "Item removed",
        description: "The item was removed from your wishlist",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  });

  const handleDeleteItem = (itemId: number) => {
    deleteItemMutation.mutate(itemId);
  };

  const handleShare = () => {
    if (wishlist) {
      const shareUrl = `${window.location.origin}/shared/${wishlist.shareId}`;
      navigator.clipboard.writeText(shareUrl).then(
        () => {
          setCopied(true);
          toast({
            title: "Link copied",
            description: "Wishlist link copied to clipboard",
          });
          
          // Reset copied state after 2 seconds
          setTimeout(() => setCopied(false), 2000);
        },
        () => {
          toast({
            title: "Error",
            description: "Failed to copy link",
            variant: "destructive",
          });
        }
      );
    }
  };

  if (!match) {
    return (
      <div>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold">Wishlist not found</h1>
          <p className="mt-4">The wishlist you're looking for doesn't exist or has been removed.</p>
          <Button className="mt-6" onClick={() => setLocation('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                className="mr-2"
                onClick={() => setLocation('/dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              {isLoadingWishlist ? (
                <Skeleton className="h-8 w-40" />
              ) : (
                <h1 className="text-2xl font-bold">{wishlist?.name}</h1>
              )}
            </div>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleShare}
              disabled={!wishlist}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Share
            </Button>
          </div>

          {isLoadingItems ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex space-x-4">
                    <Skeleton className="h-16 w-16 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-red-500 mb-4">Failed to load wishlist items</p>
                <Button 
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${id}/items`] })}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : items && items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <WishlistItem 
                  key={item.id} 
                  item={item} 
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-medium mb-2">No items in this wishlist yet</h3>
                <p className="text-gray-500 mb-4">
                  Use the Chrome extension to add items from your favorite websites
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
