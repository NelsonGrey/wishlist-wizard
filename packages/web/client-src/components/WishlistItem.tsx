import { useState } from "react";
import { Check, Copy, ExternalLink, MoreHorizontal, Trash2, Heart, Bell, Pencil, Info } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ContributionDialog from "@/components/ContributionDialog";
import PriceAlertDialog from "@/components/PriceAlertDialog";

type WishlistItem = DbWishlistItem;

interface WishlistItemProps {
  item: WishlistItem;
  onEdit?: () => void;
  onDelete: () => void;
  onReserve?: () => void;
  onPurchase?: () => void;
  reserveLabel?: string;
  purchaseLabel?: string;
  currentUserId?: string;
  reserveDisabled?: boolean;
  purchaseDisabled?: boolean;
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
}: WishlistItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isContributionDialogOpen, setIsContributionDialogOpen] = useState(false);
  const [isPriceAlertDialogOpen, setIsPriceAlertDialogOpen] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const affiliateConversion = (item.metadata as { affiliateConversion?: { affiliateProgram?: string; commission?: number } } | undefined)
    ?.affiliateConversion;

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    onDelete();
    setIsDeleteDialogOpen(false);
  };

  const handleContribute = () => {
    setIsContributionDialogOpen(true);
  };

  const handlePriceAlert = () => {
    setIsPriceAlertDialogOpen(true);
  };

  const handleViewDetails = () => {
    setIsDetailsDialogOpen(true);
  };

  const isPurchased = Boolean(item.purchasedByUserId);
  const isReserved = Boolean(item.reservedByUserId);
  const normalizedItemId = String(item.id).replace(/[^a-zA-Z0-9_-]/g, '-');
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

  return (
    <>
      <Card data-testid={`wishlist-item-card-${normalizedItemId}`}>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <img 
              src={item.imageUrl} 
              alt={item.title}
              className="w-16 h-16 object-cover rounded-md"
            />
            <div className="flex-1">
              <div className="flex justify-between">
                <h3 className="font-medium line-clamp-2">{item.title}</h3>
                <div className="flex space-x-2 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewDetails}
                    className="text-xs px-2 py-1 h-8"
                    data-testid={`wishlist-item-details-${normalizedItemId}`}
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                  
                  <PrivacyControls
                    entityType="item"
                    entityId={item.id}
                    entityName={item.title}
                    showAsBadge={true}
                  />
                  
                  <a
                    href={item.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${item.title} on ${item.store || 'store'}`}
                    className="text-gray-500 hover:text-primary p-1"
                    onClick={handleAffiliateClick}
                    data-testid={`wishlist-item-view-product-${normalizedItemId}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-gray-700 h-8 w-8"
                        aria-label="More item actions"
                        data-testid={`wishlist-item-more-${normalizedItemId}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={handleContribute} data-testid={`wishlist-item-contribute-${normalizedItemId}`}>
                        <Heart className="h-4 w-4 mr-2" />
                        Contribute
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={handlePriceAlert} data-testid={`wishlist-item-alert-${normalizedItemId}`}>
                        <Bell className="h-4 w-4 mr-2" />
                        Alert
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={handleCopyProductUrl} data-testid={`wishlist-item-copy-link-${normalizedItemId}`}>
                        {isLinkCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                        {isLinkCopied ? 'Copied!' : 'Copy Link'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onEdit}
                      className="text-gray-500 hover:text-blue-600 h-8 w-8"
                      aria-label="Edit item"
                      data-testid={`wishlist-item-edit-${normalizedItemId}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
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
                </div>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-sm font-semibold text-gray-900">{item.price}</span>
                <span className="text-xs text-gray-500 ml-1">{item.store}</span>
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
                <p className="text-sm text-gray-500 mt-2">{item.note}</p>
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
                <p className="text-xs text-gray-500 mt-2">{actionStatusMessage}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid={`wishlist-item-delete-dialog-${normalizedItemId}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from your wishlist? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`wishlist-item-delete-cancel-${normalizedItemId}`}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600" data-testid={`wishlist-item-delete-confirm-${normalizedItemId}`}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{item.title}</DialogTitle>
            <DialogDescription>
              Detailed item information and actions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md overflow-hidden border">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-56 object-cover"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="font-medium">Price:</span> {item.price}</div>
              <div><span className="font-medium">Store:</span> {item.store}</div>
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
                <h4 className="font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            )}

            {item.note && (
              <div>
                <h4 className="font-medium mb-1">Note</h4>
                <p className="text-sm text-muted-foreground">{item.note}</p>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-1">Product URL</h4>
              <a
                href={item.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline break-all"
              >
                {item.productUrl}
              </a>
            </div>
          </div>

          <DialogFooter className="flex-wrap gap-2">
            {onEdit && (
              <Button variant="outline" onClick={() => { setIsDetailsDialogOpen(false); onEdit(); }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button variant="outline" onClick={() => { setIsDetailsDialogOpen(false); handleContribute(); }}>
              <Heart className="h-4 w-4 mr-2" />
              Contribute
            </Button>
            <Button variant="outline" onClick={() => { setIsDetailsDialogOpen(false); handlePriceAlert(); }}>
              <Bell className="h-4 w-4 mr-2" />
              Alert
            </Button>
            {onReserve && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailsDialogOpen(false);
                  onReserve();
                }}
                disabled={!canReserve || Boolean(reserveDisabled)}
                title={reserveDisabledReason}
              >
                {reserveLabel || 'Reserve'}
              </Button>
            )}
            {onPurchase && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailsDialogOpen(false);
                  onPurchase();
                }}
                disabled={!canPurchase || Boolean(purchaseDisabled)}
                title={purchaseDisabledReason}
              >
                {purchaseLabel || 'Mark Purchased'}
              </Button>
            )}
            <Button asChild>
              <a href={item.productUrl} target="_blank" rel="noopener noreferrer" onClick={handleAffiliateClick}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Product
              </a>
            </Button>
            <Button variant="outline" onClick={handleCopyProductUrl} data-testid={`wishlist-item-copy-link-dialog-${normalizedItemId}`}>
              {isLinkCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {isLinkCopied ? 'Copied!' : 'Copy Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContributionDialog
        open={isContributionDialogOpen}
        onClose={() => setIsContributionDialogOpen(false)}
        item={item}
        onContributionSuccess={handleContributionSuccess}
      />

      <PriceAlertDialog
        open={isPriceAlertDialogOpen}
        onClose={() => setIsPriceAlertDialogOpen(false)}
        item={item}
        onAlertCreated={handleAlertCreated}
      />
    </>
  );
}
