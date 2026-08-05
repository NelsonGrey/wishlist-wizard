import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ExternalLink, Lock, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AffiliateIndicator from "@/components/AffiliateIndicator";
import { getApiErrorMessage } from "@/lib/api-errors";
import { apiRequest } from "@/lib/queryClient";
import type { PrivacyCheckResult } from "@/hooks/use-privacy";

type Wishlist = {
  id: number;
  name: string;
  userId: number;
  shareId: string;
  createdAt: string;
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
  metadata?: {
    affiliateConversion?: {
      affiliateProgram?: string;
      commission?: number;
    };
  };
};

type SharedWishlistResponse = {
  wishlist: Wishlist;
  items: WishlistItem[];
};

function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = `Check out my wishlist: ${title}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
        aria-label="Copy link"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy link"}
      </button>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        aria-label="Share on X (Twitter)"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Share on X
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-blue-600 hover:text-blue-700 transition-colors"
        aria-label="Share on Facebook"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        Facebook
      </a>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-green-500 hover:text-green-700 transition-colors"
        aria-label="Share on WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
        WhatsApp
      </a>
    </div>
  );
}

export default function SharedWishlist() {
  const [match, params] = useRoute('/shared/:shareId');
  const [, setLocation] = useLocation();
  
  const shareId = match ? String(params.shareId || '').trim() : '';
  const isShareIdValid = /^[A-Za-z0-9_-]+$/.test(shareId);

  // Fetch shared wishlist
  const { 
    data, 
    isLoading, 
    error,
    isError,
    refetch,
  } = useQuery<SharedWishlistResponse>({
    queryKey: [`/api/shared/${shareId}`],
    enabled: Boolean(shareId && isShareIdValid),
  });

  // Check access to the wishlist
  const {
    data: wishlistAccess,
    isLoading: accessLoading
  } = useQuery<PrivacyCheckResult | null>({
    queryKey: ['wishlist-access', shareId],
    queryFn: async () => {
      if (!data?.wishlist) return null;

      // Check if user has access to view this wishlist. Must go through
      // apiRequest (not a raw fetch) so the caller's Firebase ID token and
      // environment-aware API URL are actually attached — otherwise this
      // always evaluates access as anonymous regardless of who's signed in.
      try {
        return await apiRequest('/api/privacy/check-access', {
          method: 'POST',
          body: {
            entityType: 'wishlist',
            entityId: data.wishlist.id,
            interactionType: 'view'
          }
        }) as PrivacyCheckResult;
      } catch {
        // If privacy check fails, assume no access
        return { hasAccess: false, isOwner: false, requiresApproval: false };
      }
    },
    enabled: !!data?.wishlist
  });

  // Filter items based on access permissions
  const accessibleItems = data?.items?.filter(() => {
    // For now, if user has access to wishlist, they can see all items
    // In the future, we could check individual item privacy settings
    return wishlistAccess?.hasAccess !== false;
  }) || [];

  // Determine if user should see content
  const canViewWishlist = !wishlistAccess || wishlistAccess.hasAccess !== false;

  if (!match) {
    return (
      <div>
        <div className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
          <h1 className="text-2xl font-bold">Shared wishlist not found</h1>
          <p className="mt-4">The wishlist you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Button className="mt-6" onClick={() => setLocation('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!isShareIdValid) {
    return (
      <div className="flex flex-col">
        <main className="flex-1">
          <div className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-semibold mb-2">Invalid share link</h2>
                <p className="text-gray-500 mb-6">
                  This shared wishlist link appears malformed. Please verify the link and try again.
                </p>
                <Button onClick={() => setLocation('/')}>
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const wishlistName = data?.wishlist?.name;
  const pageTitle = wishlistName ? `${wishlistName} | Wishlist Wizard` : "Shared Wishlist | Wishlist Wizard";
  const pageDescription = wishlistName
    ? `View ${wishlistName} on Wishlist Wizard — ${accessibleItems.length || 0} items shared with you.`
    : "A wishlist shared with you on Wishlist Wizard.";

  return (
    <div className="flex flex-col">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
          <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border">
            <h1 data-testid="shared-wishlist-title" className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent mb-2">
              {isLoading ? (
                <Skeleton className="h-8 w-64" />
              ) : canViewWishlist ? (
                data?.wishlist.name
              ) : (
                "Private Wishlist"
              )}
            </h1>
            <p className="text-gray-500 mb-3">
              {isLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : canViewWishlist ? (
                `Shared wishlist • ${accessibleItems.length || 0} items`
              ) : (
                "This wishlist is private"
              )}
            </p>
            {!isLoading && canViewWishlist && wishlistName && (
              <ShareButtons title={wishlistName} />
            )}
          </div>

          {isLoading || accessLoading ? (
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
          ) : !canViewWishlist ? (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Access Restricted</p>
                  <p>This wishlist is private and you don&apos;t have permission to view it.</p>
                  <p className="text-sm text-muted-foreground">
                    The owner may need to adjust the privacy settings or add you to the access list.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ) : isError ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-red-500 mb-2">Failed to load shared wishlist</p>
                <p className="text-sm text-gray-500 mb-4">{getApiErrorMessage(error, 'Please try again.')}</p>
                <div className="flex items-center justify-center gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => refetch()}
                  >
                    Retry
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation('/')}
                  >
                    Go to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : accessibleItems && accessibleItems.length > 0 ? (
            <div className="space-y-4">
              {accessibleItems.map((item) => {
                const affiliateConversion = item.metadata?.affiliateConversion;
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

                return (
                  <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex space-x-4">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium line-clamp-2">{item.title}</h3>
                        <div className="flex items-center justify-between mt-1">
                          <div>
                            <span className="text-sm font-semibold text-gray-900">{item.price}</span>
                            <span className="text-xs text-gray-500 ml-1">{item.store}</span>
                          </div>
                          <Button asChild size="sm" className="flex items-center gap-1">
                            <a
                              href={item.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`View ${item.title} on ${item.store || 'store'}`}
                              onClick={handleAffiliateClick}
                              data-testid={`shared-wishlist-buy-now-${item.id}`}
                            >
                              Buy Now
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                        {affiliateConversion && (
                          <div className="mt-2">
                            <AffiliateIndicator metadata={{ affiliateConversion }} />
                          </div>
                        )}
                        {item.note && (
                          <p className="text-sm text-gray-500 mt-2">{item.note}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-medium mb-2">No items available</h3>
                <p className="text-gray-500">
                  {canViewWishlist 
                    ? "This shared wishlist doesn't have any items yet."
                    : "You don't have access to view items in this wishlist."
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
