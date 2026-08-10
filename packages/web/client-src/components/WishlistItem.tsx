import { ReactNode, useState } from "react";
import { Link } from "wouter";
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, MoreHorizontal, Trash2, Heart, Bell, Pencil, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WishlistItem as DbWishlistItem } from "@wishlist-wizard/shared";
import PrivacyControls from "@/components/privacy/PrivacyControls";
import AffiliateIndicator from "@/components/AffiliateIndicator";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ContributionDialog from "@/components/ContributionDialog";
import PriceAlertDialog from "@/components/PriceAlertDialog";
import { FeatureFlags, getRemoteConfig } from "@shared/firebase-utils";

type WishlistItem = DbWishlistItem;

interface WishlistItemProps {
  item: WishlistItem;
  onEdit?: () => void;
  onDelete?: () => void;
  onReserve?: () => void;
  onPurchase?: () => void;
  reserveLabel?: string;
  purchaseLabel?: string;
  currentUserId?: string;
  reserveDisabled?: boolean;
  purchaseDisabled?: boolean;
  searchQuery?: string;
}

export default function WishlistItem({
  item,
  onEdit,
  onDelete,
  onReserve,
  onPurchase,
  reserveLabel,
  purchaseLabel,
  currentUserId,
  reserveDisabled,
  purchaseDisabled,
  searchQuery,
}: WishlistItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isContributionDialogOpen, setIsContributionDialogOpen] = useState(false);
  const [isPriceAlertDialogOpen, setIsPriceAlertDialogOpen] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const affiliateConversion = (item.metadata as { affiliateConversion?: { affiliateProgram?: string; commission?: number } } | undefined)
    ?.affiliateConversion;

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    onDelete?.();
    setIsDeleteDialogOpen(false);
  };

  const handleContribute = () => {
    setIsContributionDialogOpen(true);
  };

  const handlePriceAlert = () => {
    setIsPriceAlertDialogOpen(true);
  };

  const handleToggleDetails = () => {
    setIsExpanded((prev) => !prev);
  };

  const isPurchased = Boolean(item.purchasedByUserId);
  const isReserved = Boolean(item.reservedByUserId);
  const isStripeReady = Boolean(String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim());
  const priceAlertsEnabled = getRemoteConfig().isFeatureEnabled(FeatureFlags.PRICE_ALERTS_ENABLED);
  const normalizedItemId = String(item.id).replace(/[^a-zA-Z0-9_-]/g, '-');
  const itemDisplayTitle = String(item.title || 'item');
  const reservedByUserId = item.reservedByUserId == null ? null : String(item.reservedByUserId);
  const isReservedByCurrentUser = Boolean(currentUserId && reservedByUserId === currentUserId);

  const canReserve = !isPurchased && (!isReserved || isReservedByCurrentUser);
  const canPurchase = !isPurchased && (!isReserved || isReservedByCurrentUser);

  const actionStatusMessage = isPurchased
    ? 'Already purchased'
    : isReserved && !isReservedByCurrentUser
      ? 'Reserved by another user'
      : isReservedByCurrentUser
        ? 'Reserved by you'
        : null;

  const reserveDisabledReason = !canReserve || Boolean(reserveDisabled)
    ? actionStatusMessage || 'Action unavailable'
    : undefined;

  const purchaseDisabledReason = !canPurchase || Boolean(purchaseDisabled)
    ? actionStatusMessage || 'Action unavailable'
    : undefined;

  const handleAffiliateClick = () => {
    if (!item.productUrl || !affiliateConversion) return;

    apiRequest('/api/affiliate/track-click', {
      method: 'POST',
      body: {
        url: item.productUrl,
        program: affiliateConversion?.affiliateProgram || null
      }
    }).catch((error) => {
      console.warn('Failed to track affiliate click:', error);
    });
  };

  const handleContributionSuccess = () => {
    // Could refresh the item data or show a success message
    setIsContributionDialogOpen(false);
  };

  const handleAlertCreated = () => {
    setIsPriceAlertDialogOpen(false);
  };

  const handleCopyProductUrl = () => {
    if (!item.productUrl || isLinkCopied) {
      return;
    }

    const fallbackCopy = () => {
      const textArea = document.createElement('textarea');
      textArea.value = item.productUrl;
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
      ? navigator.clipboard.writeText(item.productUrl).catch(() => {
          fallbackCopy();
        })
      : Promise.resolve().then(() => fallbackCopy());

    copyPromise.then(() => {
      setIsLinkCopied(true);
      setTimeout(() => {
        setIsLinkCopied(false);
      }, 2000);
    }).catch(() => {
      setIsLinkCopied(false);
    });
  };

  const renderHighlightedText = (text?: string | null): ReactNode => {
    const content = String(text || '');
    const query = String(searchQuery || '').trim();

    if (!content || !query) {
      return content;
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'ig');
    const parts = content.split(regex);

    if (parts.length <= 1) {
      return content;
    }

    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={`${part}-${index}`}
          data-testid={`wishlist-item-highlight-${normalizedItemId}`}
          className="rounded px-0.5 bg-muted text-foreground"
        >
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
  };

  return (
    <>
      <Card data-testid={`wishlist-item-card-${normalizedItemId}`}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <img 
              src={item.imageUrl} 
              alt={item.title}
              className="w-16 h-16 object-cover rounded-md self-center sm:self-start"
            />
            <div className="flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="font-medium line-clamp-2">{renderHighlightedText(item.title)}</h3>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 sm:ml-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToggleDetails}
                        className="text-xs px-2 py-1 h-8 shrink-0"
                        aria-expanded={isExpanded}
                        data-testid={`wishlist-item-details-${normalizedItemId}`}
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                        Details
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isExpanded ? 'Hide item details' : 'Show brand, category, description, and price history'}
                    </TooltipContent>
                  </Tooltip>
                  
                  <PrivacyControls
                    entityType="item"
                    entityId={item.id}
                    entityName={item.title}
                    showAsBadge={true}
                  />
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={item.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${itemDisplayTitle} on ${item.store || 'store'} in a new tab`}
                        title={`View ${item.title} on ${item.store || 'store'}`}
                        className="text-gray-500 hover:text-primary p-1"
                        onClick={handleAffiliateClick}
                        data-testid={`wishlist-item-view-product-${normalizedItemId}`}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      Open product page
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-gray-700 h-8 w-8"
                        aria-label={`More actions for ${itemDisplayTitle}`}
                        title="More item actions"
                        data-testid={`wishlist-item-more-${normalizedItemId}`}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" aria-label={`Actions for ${itemDisplayTitle}`}>
                      {isStripeReady && (
                        <DropdownMenuItem aria-label={`Contribute to ${itemDisplayTitle}`} onSelect={handleContribute} data-testid={`wishlist-item-contribute-${normalizedItemId}`}>
                          <Heart className="h-4 w-4 mr-2" aria-hidden="true" />
                          Contribute
                        </DropdownMenuItem>
                      )}
                      {priceAlertsEnabled && (
                        <DropdownMenuItem aria-label={`Set price alert for ${itemDisplayTitle}`} onSelect={handlePriceAlert} data-testid={`wishlist-item-alert-${normalizedItemId}`}>
                          <Bell className="h-4 w-4 mr-2" aria-hidden="true" />
                          Alert
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem aria-label={`Copy product link for ${itemDisplayTitle}`} onSelect={handleCopyProductUrl} data-testid={`wishlist-item-copy-link-${normalizedItemId}`}>
                        {isLinkCopied ? <Check className="h-4 w-4 mr-2" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-2" aria-hidden="true" />}
                        {isLinkCopied ? 'Copied!' : 'Copy Link'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {onEdit && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onEdit}
                          className="text-gray-500 hover:text-emerald-700 h-8 w-8"
                          aria-label="Edit item"
                          data-testid={`wishlist-item-edit-${normalizedItemId}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Edit item details
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {onDelete && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleDelete}
                          className="text-gray-500 hover:text-red-500 h-8 w-8"
                          aria-label="Delete item"
                          data-testid={`wishlist-item-delete-${normalizedItemId}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Delete item
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <span className="text-sm font-semibold text-gray-900">{renderHighlightedText(item.price)}</span>
                <span className="text-xs text-gray-500">{renderHighlightedText(item.store)}</span>
                {item.purchasedByUserId ? (
                  <Badge variant="secondary" className="ml-2" data-testid={`wishlist-item-status-purchased-${normalizedItemId}`}>Purchased</Badge>
                ) : item.reservedByUserId ? (
                  <Badge variant="outline" className="ml-2" data-testid={`wishlist-item-status-reserved-${normalizedItemId}`}>Reserved</Badge>
                ) : null}
              </div>
              {affiliateConversion && (
                <div className="mt-2">
                  <AffiliateIndicator metadata={{ affiliateConversion }} />
                </div>
              )}
              {item.note && (
                <p className="text-sm text-gray-500 mt-2">{renderHighlightedText(item.note)}</p>
              )}

              {(onReserve || onPurchase) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {onReserve && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onReserve}
                      disabled={!canReserve || Boolean(reserveDisabled)}
                      title={reserveDisabledReason}
                      data-testid={`wishlist-item-reserve-${normalizedItemId}`}
                    >
                      {reserveLabel || 'Reserve'}
                    </Button>
                  )}
                  {onPurchase && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onPurchase}
                      disabled={!canPurchase || Boolean(purchaseDisabled)}
                      title={purchaseDisabledReason}
                      data-testid={`wishlist-item-purchase-${normalizedItemId}`}
                    >
                      {purchaseLabel || 'Mark Purchased'}
                    </Button>
                  )}
                </div>
              )}
              {actionStatusMessage && (onReserve || onPurchase) && (
                <p className="text-xs text-gray-500 mt-2" role="status" aria-live="polite">{actionStatusMessage}</p>
              )}

              {isExpanded && (
                <div className="mt-3 pt-3 border-t space-y-3" data-testid={`wishlist-item-expanded-${normalizedItemId}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Brand:</span> {item.brand || 'N/A'}</div>
                    <div><span className="font-medium">Category:</span> {item.category || 'N/A'}</div>
                    <div><span className="font-medium">Availability:</span> {item.availability || 'N/A'}</div>
                    <div>
                      <span className="font-medium">Rating:</span>{' '}
                      {item.rating ? `${item.rating}${item.reviewCount ? ` (${item.reviewCount} reviews)` : ''}` : 'N/A'}
                    </div>
                  </div>

                  {item.description && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-sm mb-1">Product URL</h4>
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${itemDisplayTitle} product page in a new tab`}
                      className="text-sm text-primary underline break-all"
                      onClick={handleAffiliateClick}
                    >
                      {item.productUrl}
                    </a>
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/app/price-tracking?itemId=${encodeURIComponent(String(item.id))}`}
                      data-testid={`wishlist-item-price-history-${normalizedItemId}`}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Price History
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid={`wishlist-item-delete-dialog-${normalizedItemId}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item from your wishlist? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`wishlist-item-delete-cancel-${normalizedItemId}`}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600" data-testid={`wishlist-item-delete-confirm-${normalizedItemId}`}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <span className="sr-only" role="status" aria-live="polite" data-testid={`wishlist-item-copy-status-${normalizedItemId}`}>
        {isLinkCopied ? `Product link copied for ${itemDisplayTitle}` : ''}
      </span>

      {isStripeReady && (
        <ContributionDialog
          open={isContributionDialogOpen}
          onClose={() => setIsContributionDialogOpen(false)}
          item={item}
          onContributionSuccess={handleContributionSuccess}
        />
      )}

      {priceAlertsEnabled && (
        <PriceAlertDialog
          open={isPriceAlertDialogOpen}
          onClose={() => setIsPriceAlertDialogOpen(false)}
          item={item}
          onAlertCreated={handleAlertCreated}
        />
      )}
    </>
  );
}
