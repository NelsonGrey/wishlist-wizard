import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";

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
};

type SharedWishlistResponse = {
  wishlist: Wishlist;
  items: WishlistItem[];
};

export default function SharedWishlist() {
  const [match, params] = useRoute('/shared/:shareId');
  const [location, setLocation] = useLocation();
  
  const shareId = match ? params.shareId : '';

  // Fetch shared wishlist
  const { 
    data, 
    isLoading, 
    error 
  } = useQuery<SharedWishlistResponse>({
    queryKey: [`/api/shared/${shareId}`],
    enabled: !!shareId,
  });

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold">Shared wishlist not found</h1>
          <p className="mt-4">The wishlist you're looking for doesn't exist or has been removed.</p>
          <Button className="mt-6" onClick={() => setLocation('/')}>
            Back to Home
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm border-b py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">WishKeeper</h1>
            </div>
            <Button 
              variant="outline"
              onClick={() => setLocation('/')}
            >
              Home
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border">
            <h1 className="text-2xl font-bold mb-2">
              {isLoading ? (
                <Skeleton className="h-8 w-64" />
              ) : (
                data?.wishlist.name
              )}
            </h1>
            <p className="text-gray-500">
              {isLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                `Shared wishlist • ${data?.items.length || 0} items`
              )}
            </p>
          </div>

          {isLoading ? (
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
                <p className="text-red-500 mb-4">Failed to load shared wishlist</p>
                <Button 
                  variant="outline"
                  onClick={() => setLocation('/')}
                >
                  Go to Home
                </Button>
              </CardContent>
            </Card>
          ) : data?.items && data.items.length > 0 ? (
            <div className="space-y-4">
              {data.items.map((item) => (
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
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-indigo-700"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        </div>
                        {item.note && (
                          <p className="text-sm text-gray-500 mt-2">{item.note}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-medium mb-2">No items in this wishlist</h3>
                <p className="text-gray-500">This shared wishlist doesn't have any items yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
