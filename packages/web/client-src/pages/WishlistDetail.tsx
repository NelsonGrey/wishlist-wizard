import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Check, Plus, Share2 } from "lucide-react";
import WishlistItem from "@/components/WishlistItem";
import PrivacyControls from "@/components/privacy/PrivacyControls";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wishlist as DbWishlist, WishlistItem as DbWishlistItem } from "@wishlist-wizard/shared";

type Wishlist = DbWishlist;
type WishlistItem = DbWishlistItem;
type ItemFormErrors = Partial<Record<"title" | "price" | "imageUrl" | "productUrl" | "store", string>>;

export default function WishlistDetail() {
  const [match, params] = useRoute('/wishlist/:id');
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [itemForm, setItemForm] = useState({
    title: "",
    price: "",
    imageUrl: "",
    productUrl: "",
    store: "",
    note: "",
  });
  const [itemFormErrors, setItemFormErrors] = useState<ItemFormErrors>({});
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

  const createItemMutation = useMutation({
    mutationFn: async () => {
      const numericPrice = Number(itemForm.price.replace(/[^0-9.]/g, ""));
      await apiRequest('/api/items', {
        method: 'POST',
        body: {
          wishlistId: id,
          title: itemForm.title,
          price: itemForm.price,
          imageUrl: itemForm.imageUrl,
          productUrl: itemForm.productUrl,
          store: itemForm.store,
          note: itemForm.note || null,
          numericPrice: Number.isFinite(numericPrice) ? numericPrice.toString() : null,
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${id}/items`] });
      setIsItemDialogOpen(false);
      resetItemForm();
      toast({
        title: "Item added",
        description: "New item added to your wishlist.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item.",
        variant: "destructive",
      });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      const numericPrice = Number(itemForm.price.replace(/[^0-9.]/g, ""));
      await apiRequest(`/api/items/${editingItem.id}`, {
        method: 'PATCH',
        body: {
          title: itemForm.title,
          price: itemForm.price,
          imageUrl: itemForm.imageUrl,
          productUrl: itemForm.productUrl,
          store: itemForm.store,
          note: itemForm.note || null,
          numericPrice: Number.isFinite(numericPrice) ? numericPrice.toString() : null,
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${id}/items`] });
      setIsItemDialogOpen(false);
      resetItemForm();
      toast({
        title: "Item updated",
        description: "Wishlist item updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item.",
        variant: "destructive",
      });
    }
  });

  const resetItemForm = () => {
    setEditingItem(null);
    setItemFormErrors({});
    setItemForm({
      title: "",
      price: "",
      imageUrl: "",
      productUrl: "",
      store: "",
      note: "",
    });
  };

  const updateItemFormField = (field: keyof typeof itemForm, value: string) => {
    setItemForm((prev) => ({ ...prev, [field]: value }));
    if (field in itemFormErrors) {
      setItemFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const openCreateItemDialog = () => {
    resetItemForm();
    setIsItemDialogOpen(true);
  };

  const openEditItemDialog = (item: WishlistItem) => {
    setEditingItem(item);
    setItemForm({
      title: item.title || "",
      price: item.price || "",
      imageUrl: item.imageUrl || "",
      productUrl: item.productUrl || "",
      store: item.store || "",
      note: item.note || "",
    });
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = () => {
    const nextErrors: ItemFormErrors = {};

    if (!itemForm.title.trim()) nextErrors.title = "Title is required.";
    if (!itemForm.price.trim()) nextErrors.price = "Price is required.";
    if (!itemForm.productUrl.trim()) nextErrors.productUrl = "Product URL is required.";
    if (!itemForm.imageUrl.trim()) nextErrors.imageUrl = "Image URL is required.";
    if (!itemForm.store.trim()) nextErrors.store = "Store is required.";

    if (Object.keys(nextErrors).length > 0) {
      setItemFormErrors(nextErrors);
      toast({
        title: "Required fields missing",
        description: "Title, price, image URL, product URL, and store are required.",
        variant: "destructive",
      });
      return;
    }

    const validPriceFormat = /^\$?\d+(\.\d{1,2})?$/.test(itemForm.price.trim());
    if (!validPriceFormat) {
      setItemFormErrors((prev) => ({ ...prev, price: "Use 99.99 or $99.99." }));
      toast({
        title: "Invalid price format",
        description: "Use a valid price like 99.99 or $99.99.",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(itemForm.productUrl);
    } catch {
      setItemFormErrors((prev) => ({ ...prev, productUrl: "Enter a valid URL." }));
      toast({
        title: "Invalid product URL",
        description: "Enter a valid URL for the product link.",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(itemForm.imageUrl);
    } catch {
      setItemFormErrors((prev) => ({ ...prev, imageUrl: "Enter a valid URL." }));
      toast({
        title: "Invalid image URL",
        description: "Enter a valid URL for the image link.",
        variant: "destructive",
      });
      return;
    }

    if (editingItem) {
      setItemFormErrors({});
      updateItemMutation.mutate();
      return;
    }

    setItemFormErrors({});
    createItemMutation.mutate();
  };

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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">Wishlist not found</h1>
          <p className="mt-4">The wishlist you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Button className="mt-6" onClick={() => setLocation('/dashboard')}>
            Back to Dashboard
          </Button>
      </div>
    );
  }

  return (
    <>
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">{wishlist?.name}</h1>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                className="flex items-center gap-2"
                onClick={openCreateItemDialog}
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
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
              
              {wishlist && (
                <PrivacyControls
                  entityType="wishlist"
                  entityId={wishlist.id}
                  entityName={wishlist.name}
                />
              )}
            </div>
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
                  onEdit={() => openEditItemDialog(item)}
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

      <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
        setIsItemDialogOpen(open);
        if (!open) resetItemForm();
      }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Wishlist Item" : "Add Wishlist Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the item details below." : "Add an item directly to this wishlist."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={itemForm.title} onChange={(e) => updateItemFormField("title", e.target.value)} />
              {itemFormErrors.title && <p className="text-xs text-red-600">{itemFormErrors.title}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" placeholder="$99.99" value={itemForm.price} onChange={(e) => updateItemFormField("price", e.target.value)} />
                {itemFormErrors.price && <p className="text-xs text-red-600">{itemFormErrors.price}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="store">Store</Label>
                <Input id="store" placeholder="Amazon" value={itemForm.store} onChange={(e) => updateItemFormField("store", e.target.value)} />
                {itemFormErrors.store && <p className="text-xs text-red-600">{itemFormErrors.store}</p>}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="productUrl">Product URL</Label>
              <Input id="productUrl" placeholder="https://..." value={itemForm.productUrl} onChange={(e) => updateItemFormField("productUrl", e.target.value)} />
              {itemFormErrors.productUrl && <p className="text-xs text-red-600">{itemFormErrors.productUrl}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input id="imageUrl" placeholder="https://..." value={itemForm.imageUrl} onChange={(e) => updateItemFormField("imageUrl", e.target.value)} />
              {itemFormErrors.imageUrl && <p className="text-xs text-red-600">{itemFormErrors.imageUrl}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" rows={3} value={itemForm.note} onChange={(e) => updateItemFormField("note", e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)} disabled={createItemMutation.isPending || updateItemMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem} disabled={createItemMutation.isPending || updateItemMutation.isPending}>
              {createItemMutation.isPending || updateItemMutation.isPending
                ? (editingItem ? "Saving..." : "Adding...")
                : (editingItem ? "Save Changes" : "Add Item")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
