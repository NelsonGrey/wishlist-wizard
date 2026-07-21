import { useState } from "react";
import { useLocation } from "wouter";
import { Share2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wishlist as DbWishlist } from "@wishlist-wizard/shared";
import PrivacyControls from "@/components/privacy/PrivacyControls";
import { getNextOccurrenceDate, parseOccasionDate } from "@/lib/wishlist-dates";

type Wishlist = Omit<DbWishlist, 'id' | 'userId' | 'beneficiaryId'> & {
  id: string | number;
  userId: string | number;
  beneficiaryId?: string | number | null;
  itemCount: number;
};

interface WishlistListViewProps {
  wishlists: Wishlist[];
}

function WishlistListRow({ wishlist }: { wishlist: Wishlist }) {
  const [, setLocation] = useLocation();
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const occasionDate = parseOccasionDate(wishlist.occasionDate);
  const nextOccurrenceDate = getNextOccurrenceDate(occasionDate, wishlist.recurrence);
  const displayDate = nextOccurrenceDate || occasionDate;
  const numericWishlistId = typeof wishlist.id === 'number' ? wishlist.id : Number(wishlist.id);
  const hasNumericWishlistId = Number.isFinite(numericWishlistId);

  const handleShare = () => {
    if (isSharing) return;
    const shareUrl = `${window.location.origin}/shared/${wishlist.shareId}`;
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
      if (!successful) throw new Error('Unable to copy to clipboard');
    };

    const copyPromise = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(shareUrl).catch(fallbackCopy)
      : Promise.resolve().then(fallbackCopy);

    copyPromise.then(
      () => toast({ title: "Link copied", description: "Wishlist link copied to clipboard" }),
      () => toast({ title: "Error", description: "Failed to copy link. Please copy the URL from your browser address bar.", variant: "destructive" })
    ).finally(() => setIsSharing(false));
  };

  return (
    <div
      data-testid={`wishlist-row-${wishlist.id}`}
      className="flex items-center gap-4 px-4 py-3 bg-white border rounded-lg hover:shadow-sm transition cursor-pointer"
      onClick={() => setLocation(`/app/wishlist/${wishlist.id}`)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 truncate">{wishlist.name}</h3>
          {hasNumericWishlistId && (
            <PrivacyControls
              entityType="wishlist"
              entityId={numericWishlistId}
              entityName={wishlist.name}
              showAsBadge={true}
            />
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">
          {wishlist.itemCount} {wishlist.itemCount === 1 ? 'item' : 'items'}
          {wishlist.occasion ? ` • ${wishlist.occasion}` : ''}
          {displayDate ? ` • ${displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
        </p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            data-testid={`wishlist-row-share-${wishlist.id}`}
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleShare(); }}
            disabled={isSharing}
            className="text-gray-500 hover:text-gray-700 shrink-0"
            aria-label="Share wishlist"
          >
            <Share2 className="h-5 w-5" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share wishlist</TooltipContent>
      </Tooltip>
      <ChevronRight className="h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />
    </div>
  );
}

export default function WishlistListView({ wishlists }: WishlistListViewProps) {
  return (
    <div className="flex flex-col gap-2" data-testid="wishlist-list-view">
      {wishlists.map((wishlist) => (
        <WishlistListRow key={wishlist.id} wishlist={wishlist} />
      ))}
    </div>
  );
}
