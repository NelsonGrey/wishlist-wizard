import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Check, ChevronUp, ExternalLink, Plus, Share2 } from "lucide-react";
import WishlistItem from "@/components/WishlistItem";
import PrivacyControls from "@/components/privacy/PrivacyControls";
import { getApiErrorMessage } from "@/lib/api-errors";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wishlist as DbWishlist, WishlistItem as DbWishlistItem } from "@wishlist-wizard/shared";

type Wishlist = DbWishlist;
type WishlistItem = DbWishlistItem;
type ItemFormErrors = Partial<Record<"title" | "price" | "imageUrl" | "productUrl" | "store", string>>;

export default function WishlistDetail() {
  const [legacyMatch, legacyParams] = useRoute('/wishlist/:id');
  const [pluralMatch, pluralParams] = useRoute('/wishlists/:id');
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isEditingWishlist, setIsEditingWishlist] = useState(false);
  const [itemSort, setItemSort] = useState<'newest' | 'price-low' | 'price-high' | 'title-az' | 'store-az'>('newest');
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [reservePendingItemId, setReservePendingItemId] = useState<number | string | null>(null);
  const [purchasePendingItemId, setPurchasePendingItemId] = useState<number | string | null>(null);
  const [wishlistForm, setWishlistForm] = useState({
    name: "",
    description: "",
    event: "",
    eventDate: "",
    recurrence: "none",
    reminderDays: "",
  });
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
  const { user } = useAuth();

  const applyServerItemErrors = (error: unknown): boolean => {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const data = (error as { data?: unknown }).data as
      | { fieldErrors?: Partial<Record<string, string>>; errors?: Partial<Record<string, string>> }
      | undefined;

    const candidateErrors = data?.fieldErrors || data?.errors;
    if (!candidateErrors) {
      return false;
    }

    const nextErrors: ItemFormErrors = {};
    const fieldMap: Record<string, keyof ItemFormErrors> = {
      title: 'title',
      price: 'price',
      imageUrl: 'imageUrl',
      productUrl: 'productUrl',
      store: 'store',
    };

    for (const [sourceField, targetField] of Object.entries(fieldMap)) {
      const message = candidateErrors[sourceField];
      if (typeof message === 'string' && message.trim()) {
        nextErrors[targetField] = message;
      }
    }

    if (Object.keys(nextErrors).length === 0) {
      return false;
    }

    setItemFormErrors(nextErrors);
    return true;
  };

  const wishlistId = (legacyMatch ? legacyParams?.id : pluralParams?.id) || "";

  // Fetch wishlist details
  const { data: wishlist, isLoading: isLoadingWishlist } = useQuery<Wishlist>({
    queryKey: [`/api/wishlists/${wishlistId}`],
    enabled: Boolean(wishlistId),
  });

  const resolvedWishlist = wishlist && !Array.isArray(wishlist)
    ? wishlist
    : null;
  const parsedEventDate = resolvedWishlist?.occasionDate
    ? new Date(resolvedWishlist.occasionDate)
    : null;
  const eventDateLabel = parsedEventDate && !Number.isNaN(parsedEventDate.getTime())
    ? parsedEventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const parsedUpdatedAt = resolvedWishlist?.updatedAt
    ? new Date(resolvedWishlist.updatedAt)
    : resolvedWishlist?.createdAt
      ? new Date(resolvedWishlist.createdAt)
      : null;
  const updatedAtLabel = parsedUpdatedAt && !Number.isNaN(parsedUpdatedAt.getTime())
    ? parsedUpdatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  useEffect(() => {
    if (!resolvedWishlist) {
      return;
    }

    const parsedDate = resolvedWishlist.occasionDate ? new Date(resolvedWishlist.occasionDate) : null;
    const dateValue = parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString().slice(0, 10)
      : "";

    setWishlistForm({
      name: resolvedWishlist.name || "",
      description: resolvedWishlist.description || "",
      event: resolvedWishlist.occasion || "",
      eventDate: dateValue,
      recurrence: resolvedWishlist.recurrence || "none",
      reminderDays: typeof resolvedWishlist.reminderDays === 'number' ? String(resolvedWishlist.reminderDays) : "",
    });
  }, [resolvedWishlist]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Fetch wishlist items
  const { 
    data: items, 
    isLoading: isLoadingItems, 
    error 
  } = useQuery<WishlistItem[]>({
    queryKey: [`/api/wishlists/${wishlistId}/items`],
    enabled: Boolean(wishlistId),
  });

  const sortedItems = useMemo(() => {
    if (!items || items.length <= 1) {
      return items || [];
    }

    const parsePrice = (item: WishlistItem) => {
      if (item.numericPrice && !Number.isNaN(Number(item.numericPrice))) {
        return Number(item.numericPrice);
      }
      return Number(String(item.price || '').replace(/[^0-9.]/g, '')) || 0;
    };

    const parseDate = (item: WishlistItem) => {
      const timestamp = new Date(item.createdAt).getTime();
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    return [...items].sort((left, right) => {
      if (itemSort === 'price-low') {
        return parsePrice(left) - parsePrice(right);
      }

      if (itemSort === 'price-high') {
        return parsePrice(right) - parsePrice(left);
      }

      if (itemSort === 'title-az') {
        return (left.title || '').localeCompare(right.title || '');
      }

      if (itemSort === 'store-az') {
        return (left.store || '').localeCompare(right.store || '');
      }

      return parseDate(right) - parseDate(left);
    });
  }, [items, itemSort]);

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number | string) => {
      await apiRequest(`/api/items/${itemId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${wishlistId}/items`] });
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
      const normalizedTitle = itemForm.title.trim();
      const normalizedPrice = itemForm.price.trim();
      const normalizedImageUrl = itemForm.imageUrl.trim();
      const normalizedProductUrl = itemForm.productUrl.trim();
      const normalizedStore = itemForm.store.trim();
      const normalizedNote = itemForm.note.trim();
      const numericPrice = Number(itemForm.price.replace(/[^0-9.]/g, ""));
      await apiRequest('/api/items', {
        method: 'POST',
        body: {
          wishlistId,
          title: normalizedTitle,
          price: normalizedPrice,
          imageUrl: normalizedImageUrl,
          productUrl: normalizedProductUrl,
          store: normalizedStore,
          note: normalizedNote || null,
          numericPrice: Number.isFinite(numericPrice) ? numericPrice.toString() : null,
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${wishlistId}/items`] });
      setIsItemDialogOpen(false);
      resetItemForm();
      toast({
        title: "Item added",
        description: "New item added to your wishlist.",
      });
    },
    onError: (error) => {
      const hasFieldErrors = applyServerItemErrors(error);
      toast({
        title: "Error",
        description: hasFieldErrors
          ? "Please fix the highlighted fields and try again."
          : getApiErrorMessage(error, "Failed to add item."),
        variant: "destructive",
      });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      const normalizedTitle = itemForm.title.trim();
      const normalizedPrice = itemForm.price.trim();
      const normalizedImageUrl = itemForm.imageUrl.trim();
      const normalizedProductUrl = itemForm.productUrl.trim();
      const normalizedStore = itemForm.store.trim();
      const normalizedNote = itemForm.note.trim();
      const numericPrice = Number(itemForm.price.replace(/[^0-9.]/g, ""));
      await apiRequest(`/api/items/${editingItem.id}`, {
        method: 'PATCH',
        body: {
          title: normalizedTitle,
          price: normalizedPrice,
          imageUrl: normalizedImageUrl,
          productUrl: normalizedProductUrl,
          store: normalizedStore,
          note: normalizedNote || null,
          numericPrice: Number.isFinite(numericPrice) ? numericPrice.toString() : null,
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${wishlistId}/items`] });
      setIsItemDialogOpen(false);
      resetItemForm();
      toast({
        title: "Item updated",
        description: "Wishlist item updated successfully.",
      });
    },
    onError: (error) => {
      const hasFieldErrors = applyServerItemErrors(error);
      toast({
        title: "Error",
        description: hasFieldErrors
          ? "Please fix the highlighted fields and try again."
          : getApiErrorMessage(error, "Failed to update item."),
        variant: "destructive",
      });
    }
  });

  const isItemMutationPending = createItemMutation.isPending || updateItemMutation.isPending;

  const updateWishlistMutation = useMutation({
    mutationFn: async () => {
      const reminderDays = wishlistForm.recurrence === 'none'
        ? null
        : (wishlistForm.reminderDays.trim() ? Number(wishlistForm.reminderDays) : null);

      await apiRequest(`/api/wishlists/${wishlistId}`, {
        method: 'PATCH',
        body: {
          name: wishlistForm.name.trim(),
          description: wishlistForm.description.trim() || null,
          occasion: wishlistForm.event.trim() || null,
          occasionDate: wishlistForm.eventDate
            ? new Date(`${wishlistForm.eventDate}T12:00:00`).toISOString()
            : null,
          recurrence: wishlistForm.recurrence,
          reminderDays,
        }
      });
    },
    onSuccess: () => {
      setIsEditingWishlist(false);
      queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${wishlistId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/wishlists'] });
      toast({
        title: "Wishlist updated",
        description: "Wishlist details saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update wishlist details."),
        variant: "destructive",
      });
    }
  });

  const reserveItemMutation = useMutation({
    mutationFn: async (itemId: number | string) => {
      await apiRequest(`/api/items/${itemId}/reserve`, {
        method: 'POST',
        body: {},
      });
    },
    onMutate: (itemId) => {
      setReservePendingItemId(itemId);
      setPurchasePendingItemId(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${wishlistId}/items`] });
      toast({
        title: "Item reserved",
        description: "This item is now reserved.",
      });
    },
    onError: (error) => {
      const description = getApiErrorMessage(error, "Unable to reserve item.");
      toast({
        title: "Reserve failed",
        description,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setReservePendingItemId(null);
      setPurchasePendingItemId(null);
    },
  });

  const purchaseItemMutation = useMutation({
    mutationFn: async (itemId: number | string) => {
      await apiRequest(`/api/items/${itemId}/purchase`, {
        method: 'POST',
        body: {},
      });
    },
    onMutate: (itemId) => {
      setPurchasePendingItemId(itemId);
      setReservePendingItemId(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${wishlistId}/items`] });
      toast({
        title: "Item marked purchased",
        description: "This item is now marked as purchased.",
      });
    },
    onError: (error) => {
      const description = getApiErrorMessage(error, "Unable to mark item as purchased.");
      toast({
        title: "Purchase failed",
        description,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPurchasePendingItemId(null);
      setReservePendingItemId(null);
    },
  });

  const handleSaveWishlist = () => {
    if (!wishlistForm.name.trim()) {
      toast({
        title: "Name is required",
        description: "Please provide a wishlist name.",
        variant: "destructive",
      });
      return;
    }

    if (wishlistForm.recurrence !== 'none' && wishlistForm.reminderDays.trim()) {
      const reminderDays = Number(wishlistForm.reminderDays);
      if (!Number.isFinite(reminderDays) || reminderDays < 0 || reminderDays > 365) {
        toast({
          title: "Invalid reminder days",
          description: "Reminder days must be between 0 and 365.",
          variant: "destructive",
        });
        return;
      }
    }

    updateWishlistMutation.mutate();
  };

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
    if (isItemMutationPending) {
      return;
    }

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
      new URL(itemForm.productUrl.trim());
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
      new URL(itemForm.imageUrl.trim());
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

  const handleDeleteItem = (itemId: number | string) => {
    deleteItemMutation.mutate(itemId);
  };

  const handleReserveItem = (itemId: number | string) => {
    if (reserveItemMutation.isPending || purchaseItemMutation.isPending) {
      return;
    }
    reserveItemMutation.mutate(itemId);
  };

  const handlePurchaseItem = (itemId: number | string) => {
    if (reserveItemMutation.isPending || purchaseItemMutation.isPending) {
      return;
    }
    purchaseItemMutation.mutate(itemId);
  };

  const handleShare = () => {
    if (!resolvedWishlist || isSharing) {
      return;
    }

    const shareUrl = `${window.location.origin}/shared/${resolvedWishlist.shareId}`;
    setIsSharing(true);

    const fallbackCopy = () => {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (!successful) {
        throw new Error('Unable to copy to clipboard');
      }
    };

    const copyPromise = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(shareUrl).catch(() => {
          fallbackCopy();
        })
      : Promise.resolve().then(() => fallbackCopy());

    copyPromise.then(
      () => {
        setCopied(true);
        toast({
          title: "Link copied",
          description: "Wishlist link copied to clipboard",
        });
        
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        toast({
          title: "Error",
          description: "Failed to copy link. Please copy the URL from your browser address bar.",
          variant: "destructive",
        });
      }
    ).finally(() => {
      setIsSharing(false);
    });
  };

  const handleOpenSharedWishlist = () => {
    if (!resolvedWishlist) {
      return;
    }

    const shareUrl = `${window.location.origin}/shared/${resolvedWishlist.shareId}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  if (!wishlistId) {
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

  if (!isLoadingWishlist && !resolvedWishlist) {
    return (
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-2">Wishlist not found</h2>
              <p className="text-gray-500 mb-6">
                This wishlist may not exist anymore, or you may not have access to view it.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${wishlistId}`] })}>
                  Retry
                </Button>
                <Button onClick={() => setLocation('/dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex-1">
        <div data-testid="wishlist-detail-page" className="container mx-auto px-4 py-8 pb-24 sm:pb-8 max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-start sm:items-center">
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
                <div>
                  <h1 data-testid="wishlist-detail-title" className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">{resolvedWishlist?.name || "Wishlist Details"}</h1>
                  {(resolvedWishlist?.occasion || eventDateLabel) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {resolvedWishlist?.occasion ? `Event: ${resolvedWishlist.occasion}` : null}
                      {resolvedWishlist?.occasion && eventDateLabel ? ' • ' : null}
                      {eventDateLabel ? `Event Date: ${eventDateLabel}` : null}
                    </p>
                  )}
                  {updatedAtLabel && (
                    <p className="text-xs text-gray-500 mt-1" data-testid="wishlist-detail-last-updated">
                      Last updated: {updatedAtLabel}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    data-testid="wishlist-detail-share"
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={handleShare}
                    disabled={!resolvedWishlist || isSharing}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    {isSharing ? 'Sharing...' : copied ? 'Copied!' : 'Share'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Copy a public wishlist link
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="wishlist-detail-open-shared"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={handleOpenSharedWishlist}
                    disabled={!resolvedWishlist}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Shared Page
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Preview the public shared wishlist
                </TooltipContent>
              </Tooltip>
              
              {resolvedWishlist && (
                <PrivacyControls
                  entityType="wishlist"
                  entityId={resolvedWishlist.id}
                  entityName={resolvedWishlist.name}
                />
              )}
            </div>
          </div>

          <Card className="mb-4 sm:hidden">
            <CardContent className="p-3">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                    Items: {items?.length ?? 0}
                  </span>
                  {eventDateLabel && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      Event: {eventDateLabel}
                    </span>
                  )}
                  {updatedAtLabel && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      Updated: {updatedAtLabel}
                    </span>
                  )}
                </div>
                <Button
                  data-testid="wishlist-detail-mobile-share"
                  variant="outline"
                  className="w-full"
                  onClick={handleShare}
                  disabled={!resolvedWishlist || isSharing}
                >
                  {isSharing ? 'Sharing...' : copied ? 'Copied!' : 'Share Wishlist'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Wishlist Details</h2>
                  <p className="text-sm text-gray-500">Manage this wishlist&apos;s core details and schedule.</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  {isEditingWishlist && (
                    <Button
                      className="w-full sm:w-auto"
                      variant="outline"
                      onClick={() => setIsEditingWishlist(false)}
                      disabled={updateWishlistMutation.isPending}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => {
                      if (isEditingWishlist) {
                        handleSaveWishlist();
                        return;
                      }

                      setIsEditingWishlist(true);
                    }}
                    disabled={updateWishlistMutation.isPending}
                  >
                    {updateWishlistMutation.isPending ? "Saving..." : isEditingWishlist ? "Save Details" : "Edit Details"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="wishlist-name">Wishlist Name</Label>
                  <Input
                    id="wishlist-name"
                    value={wishlistForm.name}
                    onChange={(e) => setWishlistForm((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditingWishlist}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="wishlist-event">Event</Label>
                  <Input
                    id="wishlist-event"
                    placeholder="e.g., Birthday"
                    value={wishlistForm.event}
                    onChange={(e) => setWishlistForm((prev) => ({ ...prev, event: e.target.value }))}
                    disabled={!isEditingWishlist}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="wishlist-event-date">Event Date</Label>
                  <Input
                    id="wishlist-event-date"
                    type="date"
                    value={wishlistForm.eventDate}
                    onChange={(e) => setWishlistForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                    disabled={!isEditingWishlist}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Recurrence</Label>
                  <Select
                    value={wishlistForm.recurrence || 'none'}
                    onValueChange={(value) => setWishlistForm((prev) => ({ ...prev, recurrence: value }))}
                    disabled={!isEditingWishlist}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Recurrence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Does not repeat</SelectItem>
                      <SelectItem value="yearly">Repeats yearly</SelectItem>
                      <SelectItem value="monthly">Repeats monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="wishlist-reminder-days">Reminder Days</Label>
                  <Input
                    id="wishlist-reminder-days"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={365}
                    placeholder="e.g., 7"
                    value={wishlistForm.reminderDays}
                    onChange={(e) => setWishlistForm((prev) => ({ ...prev, reminderDays: e.target.value }))}
                    disabled={!isEditingWishlist || wishlistForm.recurrence === 'none'}
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="wishlist-description">Description</Label>
                  <Textarea
                    id="wishlist-description"
                    rows={3}
                    value={wishlistForm.description}
                    onChange={(e) => setWishlistForm((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={!isEditingWishlist}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Item Details</h2>
                  <p className="text-sm text-gray-500">List and manage all items in this wishlist.</p>
                </div>
                <Button
                  data-testid="wishlist-detail-add-item"
                  className="w-full sm:w-auto flex items-center justify-center gap-2"
                  onClick={openCreateItemDialog}
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="text-sm text-gray-500 mb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Total items: <span className="font-medium text-gray-900">{items?.length ?? 0}</span>
                  </span>
                  <div className="w-full sm:w-52">
                    <Select value={itemSort} onValueChange={(value) => setItemSort(value as typeof itemSort)}>
                      <SelectTrigger data-testid="wishlist-detail-sort-trigger">
                        <SelectValue placeholder="Sort items" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="title-az">Title: A to Z</SelectItem>
                        <SelectItem value="store-az">Store: A to Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                      onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${wishlistId}/items`] })}
                    >
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              ) : sortedItems && sortedItems.length > 0 ? (
                <div data-testid="wishlist-detail-items-list" className="space-y-4">
                  {sortedItems.map((item) => {
                    const isReservePendingForItem = reservePendingItemId === item.id && reserveItemMutation.isPending;
                    const isPurchasePendingForItem = purchasePendingItemId === item.id && purchaseItemMutation.isPending;
                    const disableItemActions = isReservePendingForItem || isPurchasePendingForItem;

                    return (
                    <WishlistItem 
                      key={item.id} 
                      item={item} 
                      onEdit={() => openEditItemDialog(item)}
                      onDelete={() => handleDeleteItem(item.id)}
                      onReserve={() => handleReserveItem(item.id)}
                      onPurchase={() => handlePurchaseItem(item.id)}
                      reserveLabel={isReservePendingForItem ? 'Reserving...' : 'Reserve'}
                      purchaseLabel={isPurchasePendingForItem ? 'Marking...' : 'Mark Purchased'}
                      currentUserId={user?.uid}
                      reserveDisabled={disableItemActions}
                      purchaseDisabled={disableItemActions}
                    />
                    );
                  })}
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
            </CardContent>
          </Card>
        </div>
      </main>

      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-6xl px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              data-testid="wishlist-detail-mobile-add-item"
              className="w-full"
              onClick={openCreateItemDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
            <Button
              data-testid="wishlist-detail-mobile-sticky-share"
              variant="outline"
              className="w-full"
              onClick={handleShare}
              disabled={!resolvedWishlist || isSharing}
            >
              {isSharing ? 'Sharing...' : copied ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </div>
      </div>

      {showScrollTop && (
        <Button
          data-testid="wishlist-detail-mobile-scroll-top"
          size="icon"
          variant="secondary"
          className="sm:hidden fixed bottom-24 right-4 z-40 rounded-full shadow-md"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
        if (isItemMutationPending && !open) {
          return;
        }
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
              <Input data-testid="wishlist-item-title-input" id="title" value={itemForm.title} onChange={(e) => updateItemFormField("title", e.target.value)} disabled={isItemMutationPending} />
              {itemFormErrors.title && <p className="text-xs text-red-600">{itemFormErrors.title}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price</Label>
                <Input data-testid="wishlist-item-price-input" id="price" placeholder="$99.99" value={itemForm.price} onChange={(e) => updateItemFormField("price", e.target.value)} disabled={isItemMutationPending} />
                {itemFormErrors.price && <p className="text-xs text-red-600">{itemFormErrors.price}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="store">Store</Label>
                  <Input data-testid="wishlist-item-store-input" id="store" placeholder="Amazon" value={itemForm.store} onChange={(e) => updateItemFormField("store", e.target.value)} disabled={isItemMutationPending} />
                {itemFormErrors.store && <p className="text-xs text-red-600">{itemFormErrors.store}</p>}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="productUrl">Product URL</Label>
              <Input data-testid="wishlist-item-product-url-input" id="productUrl" placeholder="https://..." value={itemForm.productUrl} onChange={(e) => updateItemFormField("productUrl", e.target.value)} disabled={isItemMutationPending} />
              {itemFormErrors.productUrl && <p className="text-xs text-red-600">{itemFormErrors.productUrl}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input data-testid="wishlist-item-image-url-input" id="imageUrl" placeholder="https://..." value={itemForm.imageUrl} onChange={(e) => updateItemFormField("imageUrl", e.target.value)} disabled={isItemMutationPending} />
              {itemFormErrors.imageUrl && <p className="text-xs text-red-600">{itemFormErrors.imageUrl}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" rows={3} value={itemForm.note} onChange={(e) => updateItemFormField("note", e.target.value)} disabled={isItemMutationPending} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)} disabled={isItemMutationPending}>
              Cancel
            </Button>
            <Button data-testid="wishlist-item-save" onClick={handleSaveItem} disabled={isItemMutationPending}>
              {isItemMutationPending
                ? (editingItem ? "Saving..." : "Adding...")
                : (editingItem ? "Save Changes" : "Add Item")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
