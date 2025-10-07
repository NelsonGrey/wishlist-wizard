import { useState } from "react";
import { useLocation } from "wouter";
import { Edit, Share2, MoreVertical, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";

type Wishlist = {
  id: number;
  name: string;
  userId: number;
  shareId: string;
  createdAt: string;
  itemCount: number;
};

type WishlistItem = {
  id: number;
  wishlistId: number;
  title: string;
  price: string;
  imageUrl: string;
  productUrl: string;
  store: string;
  note: string;
  createdAt: string;
};

interface WishlistCardProps {
  wishlist: Wishlist;
  onRefresh: () => void;
}

export default function WishlistCard({ wishlist, onRefresh }: WishlistCardProps) {
  const [location, setLocation] = useLocation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newName, setNewName] = useState(wishlist.name);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Fetch items for the wishlist preview
  const { data: items } = useQuery<WishlistItem[]>({
    queryKey: [`/api/wishlists/${wishlist.id}/items`],
  });

  // Update wishlist mutation
  const updateWishlistMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/wishlists/${wishlist.id}`, { method: 'PATCH', body: { name: newName } });
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      onRefresh();
      toast({
        title: "Wishlist updated",
        description: "Your wishlist has been renamed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update wishlist.",
        variant: "destructive",
      });
    }
  });

  // Delete wishlist mutation
  const deleteWishlistMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/wishlists/${wishlist.id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      onRefresh();
      toast({
        title: "Wishlist deleted",
        description: "Your wishlist has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete wishlist.",
        variant: "destructive",
      });
    }
  });

  const handleEditClick = () => {
    setNewName(wishlist.name);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (newName.trim() === "") {
      toast({
        title: "Error",
        description: "Wishlist name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    updateWishlistMutation.mutate();
  };

  const handleShare = () => {
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
  };

  const formattedDate = new Date(wishlist.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <>
      <Card className="hover:shadow-md transition">
        <CardContent className="p-0">
          <div className="p-5 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{wishlist.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {wishlist.itemCount} {wishlist.itemCount === 1 ? 'item' : 'items'} • Created {formattedDate}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEditClick}>
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          
          <div className="divide-y">
            {items && items.slice(0, 3).map((item) => (
              <div key={item.id} className="p-4 flex space-x-3">
                <img 
                  src={item.imageUrl} 
                  alt={item.title}
                  className="w-16 h-16 object-cover rounded-md"
                />
                <div className="flex-1">
                  <h4 className="font-medium line-clamp-2">{item.title}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{item.price}</span>
                      <span className="text-xs text-gray-500 ml-1">{item.store}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(!items || items.length === 0) && (
              <div className="p-4 text-center text-gray-500">
                No items in this wishlist yet
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 text-center border-t">
          <Button 
            variant="link" 
            className="text-primary hover:text-indigo-700 w-full"
            onClick={() => setLocation(`/wishlist/${wishlist.id}`)}
          >
            View All Items
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Wishlist</DialogTitle>
            <DialogDescription>
              Enter a new name for your wishlist.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Wishlist name"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateWishlistMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateWishlistMutation.isPending}
            >
              {updateWishlistMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Wishlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{wishlist.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteWishlistMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteWishlistMutation.mutate()}
              disabled={deleteWishlistMutation.isPending}
            >
              {deleteWishlistMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
