import { KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Download, ExternalLink, Plus, Share2 } from "lucide-react";
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
type ItemSortOption = 'newest' | 'price-low' | 'price-high' | 'title-az' | 'store-az';

const VALID_ITEM_SORTS: ItemSortOption[] = ['newest', 'price-low', 'price-high', 'title-az', 'store-az'];

const getInitialItemSort = (): ItemSortOption => {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('sort') as ItemSortOption | null;
  return fromQuery && VALID_ITEM_SORTS.includes(fromQuery) ? fromQuery : 'newest';
};

const getInitialItemSearch = (): string => {
  const params = new URLSearchParams(window.location.search);
  return params.get('q') || '';
};

const getNormalizedItemId = (id: number | string): string => String(id).replace(/[^a-zA-Z0-9_-]/g, '-');

export default function WishlistDetail() {
  const [appSingularMatch, appSingularParams] = useRoute('/app/wishlist/:id');
  const [appPluralMatch, appPluralParams] = useRoute('/app/wishlists/:id');
  const [legacyMatch, legacyParams] = useRoute('/wishlist/:id');
  const [pluralMatch, pluralParams] = useRoute('/wishlists/:id');
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isEditingWishlist, setIsEditingWishlist] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isCoordinationExpanded, setIsCoordinationExpanded] = useState(false);
  const [itemSort, setItemSort] = useState<ItemSortOption>(() => getInitialItemSort());
  const [itemSearch, setItemSearch] = useState(() => getInitialItemSearch());
  const itemSearchInputRef = useRef<HTMLInputElement | null>(null);
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
  const [linkUrl, setLinkUrl] = useState("");
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
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

  const wishlistId =
    (appSingularMatch ? appSingularParams?.id : undefined) ||
    (appPluralMatch ? appPluralParams?.id : undefined) ||
    (legacyMatch ? legacyParams?.id : undefined) ||
    (pluralMatch ? pluralParams?.id : undefined) ||
    "";

  // Fetch wishlist details
  const { data: wishlist, isLoading: isLoadingWishlist } = useQuery<Wishlist>({
    queryKey: [`/api/wishlists/${wishlistId}`],
    enabled: Boolean(wishlistId),
  });

  const resolvedWishlist = wishlist && !Array.isArray(wishlist)
    ? wishlist
    : null;
  const shareUrl = resolvedWishlist ? `${window.location.origin}/shared/${resolvedWishlist.shareId}` : "";
  const shareMessage = resolvedWishlist
    ? `Check out this wishlist: ${resolvedWishlist.name}`
    : "Check out this wishlist";
  const encodedShareMessage = encodeURIComponent(shareMessage);
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const parsedEventDate = resolvedWishlist?.occasionDate
    ? new Date(resolvedWishlist.occasionDate)
    : null;
  const eventDateLabel = parsedEventDate && !Number.isNaN(parsedEventDate.getTime())
    ? parsedEventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const wishlistUpdatedAt = resolvedWishlist
    ? (resolvedWishlist as Wishlist & { updatedAt?: string | Date | null }).updatedAt
    : null;
  const parsedUpdatedAt = wishlistUpdatedAt
    ? new Date(wishlistUpdatedAt)
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (itemSort === 'newest') {
      params.delete('sort');
    } else {
      params.set('sort', itemSort);
    }

    if (itemSearch.trim()) {
      params.set('q', itemSearch.trim());
    } else {
      params.delete('q');
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
  }, [itemSort, itemSearch]);

  useEffect(() => {
    const handleSearchShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.activeElement === itemSearchInputRef.current) {
          event.preventDefault();
          setItemSearch('');
        }
        return;
      }

      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditableTarget = tagName === 'input' || tagName === 'textarea' || Boolean(target?.isContentEditable);

      if (isEditableTarget) {
        return;
      }

      event.preventDefault();
      itemSearchInputRef.current?.focus();
      itemSearchInputRef.current?.select();
    };

    window.addEventListener('keydown', handleSearchShortcut);
    return () => {
      window.removeEventListener('keydown', handleSearchShortcut);
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

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) {
      return sortedItems;
    }

    const query = itemSearch.trim().toLowerCase();
    return sortedItems.filter((item) => {
      const searchableText = [
        item.title,
        item.store,
        item.price,
        item.numericPrice,
        item.productUrl,
        item.note,
      ]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [sortedItems, itemSearch]);

  const coordinationSummary = useMemo(() => {
    const sourceItems = items || [];
    const total = sourceItems.length;
    const purchased = sourceItems.filter((item) => Boolean(item.purchasedByUserId)).length;
    const reserved = sourceItems.filter(
      (item) => Boolean(item.reservedByUserId) && !item.purchasedByUserId
    ).length;
    const available = Math.max(0, total - purchased - reserved);

    return {
      total,
      purchased,
      reserved,
      available,
      completionPercent: total > 0 ? Math.round((purchased / total) * 100) : 0,
    };
  }, [items]);

  const handleExportCoordinationCsv = () => {
    if (!items || items.length === 0 || !resolvedWishlist) {
      toast({
        title: "No items to export",
        description: "Add items first to export coordination data.",
      });
      return;
    }

    const sanitize = (value: unknown) => String(value ?? "").replace(/"/g, '""');
    const rows = items.map((item) => {
      const status = item.purchasedByUserId
        ? "Purchased"
        : item.reservedByUserId
          ? "Reserved"
          : "Available";

      return [
        item.title,
        item.store,
        item.price,
        status,
        item.reservedByUserId ?? "",
        item.purchasedByUserId ?? "",
      ];
    });

    const header = ["Title", "Store", "Price", "Status", "Reserved By", "Purchased By"];
    const csv = [header, ...rows]
      .map((columns) => columns.map((column) => `"${sanitize(column)}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${resolvedWishlist.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-coordination.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: "Coordination CSV downloaded.",
    });
  };

  const focusItemDetailsButton = (itemId: number | string) => {
    const normalizedItemId = getNormalizedItemId(itemId);
    const detailsButton = document.querySelector<HTMLButtonElement>(
      `[data-testid="wishlist-item-details-${normalizedItemId}"]`
    );
    detailsButton?.focus();
  };

  const openItemDetails = (itemId: number | string) => {
    const normalizedItemId = getNormalizedItemId(itemId);
    const detailsButton = document.querySelector<HTMLButtonElement>(
      `[data-testid="wishlist-item-details-${normalizedItemId}"]`
    );
    detailsButton?.click();
  };

  const handleSearchInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!filteredItems.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItemDetailsButton(filteredItems[0].id);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItemDetailsButton(filteredItems[filteredItems.length - 1].id);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const targetItem = event.shiftKey ? filteredItems[filteredItems.length - 1] : filteredItems[0];
      openItemDetails(targetItem.id);
    }
  };

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
    setLinkUrl("");
    setItemForm({
      title: "",
      price: "",
      imageUrl: "",
      productUrl: "",
      store: "",
      note: "",
    });
  };

  const handleFetchProductPreview = async () => {
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) return;

    let hostname = "";
    try {
      hostname = new URL(trimmedUrl).hostname.replace(/^www\./, "");
    } catch {
      toast({
        title: "Invalid link",
        description: "Enter a valid product URL, e.g. https://www.amazon.com/...",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingPreview(true);
    try {
      const result = await apiRequest("/api/products/preview", {
        method: "POST",
        body: { url: trimmedUrl },
      }) as { ok: boolean; title?: string; image?: string; price?: number; error?: string };

      if (!result.ok) {
        toast({
          title: "Couldn't fetch product details",
          description: result.error || "No problem — fill in the details below manually.",
        });
        setItemForm((prev) => ({ ...prev, productUrl: trimmedUrl, store: prev.store || hostname }));
        return;
      }

      setItemForm((prev) => ({
        ...prev,
        title: result.title || prev.title,
        imageUrl: result.image || prev.imageUrl,
        price: result.price !== undefined ? String(result.price) : prev.price,
        productUrl: trimmedUrl,
        store: prev.store || hostname,
      }));
      setItemFormErrors({});
      toast({ title: "Found it!", description: "Review the details below, then save." });
    } catch (error) {
      toast({
        title: "Couldn't fetch product details",
        description: getApiErrorMessage(error, "No problem — fill in the details below manually."),
      });
      setItemForm((prev) => ({ ...prev, productUrl: trimmedUrl, store: prev.store || hostname }));
    } finally {
      setIsFetchingPreview(false);
    }
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

    // Only the item name is actually required (matches the backend and the mobile app) —
    // price/store/product URL/image URL are all optional, since a manually-added item may
    // not have all of them yet.
    if (!itemForm.title.trim()) nextErrors.title = "Item name is required.";

    if (itemForm.price.trim() && !/^\$?\d+(\.\d{1,2})?$/.test(itemForm.price.trim())) {
      nextErrors.price = "Use 99.99 or $99.99.";
    }

    if (itemForm.productUrl.trim()) {
      try {
        new URL(itemForm.productUrl.trim());
      } catch {
        nextErrors.productUrl = "Enter a valid URL.";
      }
    }

    if (itemForm.imageUrl.trim()) {
      try {
        new URL(itemForm.imageUrl.trim());
      } catch {
        nextErrors.imageUrl = "Enter a valid URL.";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setItemFormErrors(nextErrors);
      toast({
        title: "Check the highlighted fields",
        description: Object.values(nextErrors).join(" "),
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

    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (!resolvedWishlist || !navigator.share) {
      return;
    }

    try {
      await navigator.share({
        title: resolvedWishlist.name,
        text: shareMessage,
        url: shareUrl,
      });
    } catch {
      // User cancellation is expected in some flows; no toast needed.
    }
  };

  if (!wishlistId) {
    return (
      <div className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">Wishlist not found</h1>
          <p className="mt-4">The wishlist you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Button className="mt-6" onClick={() => setLocation('/app/dashboard')}>
            Back to Dashboard
          </Button>
      </div>
    );
  }

  if (!isLoadingWishlist && !resolvedWishlist) {
    return (
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
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
                <Button onClick={() => setLocation('/app/dashboard')}>
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
        <div data-testid="wishlist-detail-page" className="container mx-auto px-4 py-6 2xl:py-8 pb-24 sm:pb-8 max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-start sm:items-center">
              <Button 
                variant="ghost" 
                className="mr-2"
                onClick={() => setLocation('/app/dashboard')}
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
                    data-testid="wishlist-detail-share-options"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => setIsShareDialogOpen(true)}
                    disabled={!resolvedWishlist}
                  >
                    <Share2 className="h-4 w-4" />
                    Share Options
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Share via messaging and social channels
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
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
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
                <div className="flex flex-col gap-2 sm:gap-3">
                  <span>
                    Total items: <span className="font-medium text-gray-900">{items?.length ?? 0}</span>
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    <div className="flex gap-2">
                      <Input
                        ref={itemSearchInputRef}
                        data-testid="wishlist-detail-search-input"
                        value={itemSearch}
                        onKeyDown={handleSearchInputKeyDown}
                        onChange={(event) => setItemSearch(event.target.value)}
                        placeholder="Search title, store, price, or link"
                      />
                      {itemSearch.trim() && (
                        <Button
                          type="button"
                          variant="outline"
                          data-testid="wishlist-detail-search-clear"
                          onClick={() => setItemSearch('')}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
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
              ) : filteredItems && filteredItems.length > 0 ? (
                <div data-testid="wishlist-detail-items-list" className="space-y-4">
                  {filteredItems.map((item) => {
                    const isReservePendingForItem = reservePendingItemId === item.id && reserveItemMutation.isPending;
                    const isPurchasePendingForItem = purchasePendingItemId === item.id && purchaseItemMutation.isPending;
                    const disableItemActions = isReservePendingForItem || isPurchasePendingForItem;

                    return (
                    <WishlistItem
                      key={item.id}
                      item={item}
                      searchQuery={itemSearch}
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
              ) : items && items.length > 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <h3 className="text-lg font-medium mb-2">No items match your search</h3>
                    <p className="text-gray-500 mb-4">
                      Try a different keyword.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <h3 className="text-lg font-medium mb-2">No items in this wishlist yet</h3>
                    <p className="text-gray-500 mb-4">
                      Paste a product link to add your first item, or{" "}
                      <Link href="/extension" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
                        install the browser extension
                      </Link>{" "}
                      to add items as you browse.
                    </p>
                    <Button onClick={openCreateItemDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="flex items-center gap-2 text-left"
                  onClick={() => setIsDetailsExpanded((prev) => !prev)}
                  aria-expanded={isEditingWishlist || isDetailsExpanded}
                  data-testid="wishlist-detail-toggle-details"
                >
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isEditingWishlist || isDetailsExpanded ? 'rotate-180' : ''}`} />
                  <div>
                    <h2 className="text-lg font-semibold">Wishlist Details</h2>
                    {!(isEditingWishlist || isDetailsExpanded) && (
                      <p className="text-sm text-gray-500">
                        {[wishlistForm.event, wishlistForm.recurrence && wishlistForm.recurrence !== 'none' ? `Repeats ${wishlistForm.recurrence}` : null]
                          .filter(Boolean)
                          .join(' • ') || 'No event or schedule set'}
                      </p>
                    )}
                  </div>
                </button>
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

                      setIsDetailsExpanded(true);
                      setIsEditingWishlist(true);
                    }}
                    disabled={updateWishlistMutation.isPending}
                  >
                    {updateWishlistMutation.isPending ? "Saving..." : isEditingWishlist ? "Save Details" : "Edit Details"}
                  </Button>
                </div>
              </div>

              {(isEditingWishlist || isDetailsExpanded) && (
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
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="flex items-center gap-2 text-left"
                  onClick={() => setIsCoordinationExpanded((prev) => !prev)}
                  aria-expanded={isCoordinationExpanded}
                  data-testid="wishlist-detail-toggle-coordination"
                >
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isCoordinationExpanded ? 'rotate-180' : ''}`} />
                  <div>
                    <h2 className="text-lg font-semibold">Coordination Status</h2>
                    <p className="text-sm text-gray-500">
                      {coordinationSummary.total} items • {coordinationSummary.completionPercent}% purchased
                    </p>
                  </div>
                </button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto flex items-center gap-2"
                  onClick={handleExportCoordinationCsv}
                  disabled={!items || items.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              {isCoordinationExpanded && (
              <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-gray-500">Total</p>
                  <p className="text-lg font-semibold">{coordinationSummary.total}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-gray-500">Available</p>
                  <p className="text-lg font-semibold">{coordinationSummary.available}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-gray-500">Reserved</p>
                  <p className="text-lg font-semibold">{coordinationSummary.reserved}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-gray-500">Purchased</p>
                  <p className="text-lg font-semibold">{coordinationSummary.purchased}</p>
                </div>
              </div>

              <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-green-600"
                  style={{ width: `${coordinationSummary.completionPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Purchase completion: {coordinationSummary.completionPercent}%
              </p>
              </>
              )}
            </CardContent>
          </Card>

        </div>
      </main>

      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-7xl px-4 py-3">
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
            {!editingItem && (
              <div className="grid gap-2 rounded-md border p-3 bg-muted/30">
                <Label htmlFor="linkUrl">Paste a product link</Label>
                <div className="flex gap-2">
                  <Input
                    id="linkUrl"
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    disabled={isItemMutationPending || isFetchingPreview}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleFetchProductPreview}
                    disabled={!linkUrl.trim() || isFetchingPreview || isItemMutationPending}
                  >
                    {isFetchingPreview ? "Fetching..." : "Fetch details"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll try to fill in the details below. You can edit anything, or skip this and enter it all manually.
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">Item name</Label>
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
              <Label htmlFor="note">Description (optional)</Label>
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

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Share Wishlist</DialogTitle>
            <DialogDescription>
              Share this wishlist link with friends and family.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border p-3 text-sm break-all">{shareUrl || 'No share link available.'}</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleShare} disabled={!resolvedWishlist || isSharing}>
                {isSharing ? 'Copying...' : 'Copy Link'}
              </Button>
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
                <Button variant="outline" onClick={handleNativeShare} disabled={!resolvedWishlist}>
                  Use Device Share
                </Button>
              ) : (
                <Button variant="outline" onClick={handleOpenSharedWishlist} disabled={!resolvedWishlist}>
                  Open Shared Page
                </Button>
              )}
              <Button asChild variant="outline" disabled={!resolvedWishlist}>
                <a
                  href={`https://wa.me/?text=${encodedShareMessage}%20${encodedShareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" disabled={!resolvedWishlist}>
                <a
                  href={`https://t.me/share/url?url=${encodedShareUrl}&text=${encodedShareMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Telegram
                </a>
              </Button>
              <Button asChild variant="outline" disabled={!resolvedWishlist}>
                <a
                  href={`mailto:?subject=${encodeURIComponent(resolvedWishlist?.name || 'Wishlist')}&body=${encodedShareMessage}%0A%0A${encodedShareUrl}`}
                >
                  Email
                </a>
              </Button>
              <Button asChild variant="outline" disabled={!resolvedWishlist}>
                <a href={`sms:?body=${encodedShareMessage}%20${encodedShareUrl}`}>SMS</a>
              </Button>
              <Button asChild variant="outline" disabled={!resolvedWishlist}>
                <a
                  href={`https://discord.com/channels/@me`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Discord
                </a>
              </Button>
              <Button asChild variant="outline" disabled={!resolvedWishlist}>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Facebook
                </a>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
