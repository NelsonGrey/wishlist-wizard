import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import RecommendationCard from "./RecommendationCard";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { getApiErrorMessage } from "@/lib/api-errors";

interface Recommendation {
  id?: number;
  title: string;
  imageUrl: string;
  price: string;
  productUrl: string;
  store: string;
  description: string;
  relevanceScore: number;
  matchReason: string;
  category?: string;
  isViewed?: boolean;
  isSaved?: boolean;
  isRejected?: boolean;
  createdAt?: Date;
  targetWishlistId?: number | null;
}

interface RecommendationsSectionProps {
  beneficiaryId?: number;
  wishlistOptions?: { id: number; name: string }[];
  title?: string;
}

export default function RecommendationsSection({
  beneficiaryId,
  wishlistOptions,
  title = "Personalized Recommendations"
}: RecommendationsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWishlistId, setSelectedWishlistId] = useState<string>("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  
  // Fetch recommendations from the API
  const {
    data: fetchedRecommendations,
    isLoading,
    isError,
    isFetching,
    error,
    refetch
  } = useQuery<Recommendation[]>({
    queryKey: beneficiaryId 
      ? [`/api/recommendations/beneficiary/${beneficiaryId}`]
      : ['/api/recommendations'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Update local state when fetched recommendations change
  useEffect(() => {
    if (fetchedRecommendations) {
      setRecommendations(fetchedRecommendations);
    }
  }, [fetchedRecommendations]);

  useEffect(() => {
    if (!wishlistOptions || wishlistOptions.length === 0) {
      return;
    }

    if (!selectedWishlistId) {
      setSelectedWishlistId(String(wishlistOptions[0].id));
      return;
    }

    const exists = wishlistOptions.some((wishlist) => String(wishlist.id) === selectedWishlistId);
    if (!exists) {
      setSelectedWishlistId(String(wishlistOptions[0].id));
    }
  }, [wishlistOptions, selectedWishlistId]);
  
  // Mutation for updating recommendation status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status 
    }: { 
      id: number; 
      status: {isViewed?: boolean, isSaved?: boolean, isRejected?: boolean} 
    }) => {
      return apiRequest(`/api/recommendations/${id}/status`, {
        method: 'PATCH',
        body: status
      });
    },
    onSuccess: () => {
      // No need to invalidate the query as we're updating state directly
    }
  });
  
  // Handle recommendation status changes
  const handleStatusChange = (
    id: number, 
    status: {isViewed?: boolean, isSaved?: boolean, isRejected?: boolean}
  ) => {
    // Update local state immediately for responsive UI
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === id ? { ...rec, ...status } : rec
      )
    );
    
    // Make the API call
    updateStatusMutation.mutate({ id, status });
    
    // If the recommendation is rejected, we might want to remove it from the UI
    if (status.isRejected) {
      // Wait a moment for the animation to finish before removing
      setTimeout(() => {
        setRecommendations(prev => prev.filter(rec => rec.id !== id));
      }, 300);
    }
  };

  // Handle adding a recommendation to a wishlist
  const handleAddToWishlist = async (recommendation: Recommendation) => {
    if (!selectedWishlistId) {
      // If no wishlist is selected, show a toast message
      toast({
        title: "No wishlist selected",
        description: "Please select a wishlist to add this item to.",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedWishlist = wishlistOptions?.find(
        (wishlist) => String(wishlist.id) === selectedWishlistId
      );

      // Prepare the item data
      const itemData = {
        wishlistId: parseInt(selectedWishlistId),
        title: recommendation.title,
        price: recommendation.price,
        imageUrl: recommendation.imageUrl,
        productUrl: recommendation.productUrl,
        store: recommendation.store,
        note: `Added from recommendations. ${recommendation.matchReason}`,
        category: recommendation.category || null
      };

      await apiRequest('/api/items', {
        method: 'POST',
        body: itemData,
      });

      // If the recommendation has an ID, mark it as saved
      if (recommendation.id && !recommendation.isSaved) {
        handleStatusChange(recommendation.id, { isSaved: true });
      }

      // Show success toast
      toast({
        title: "Item added!",
        description: `"${recommendation.title}" was added to ${selectedWishlist?.name || 'your wishlist'}.`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/wishlists/${selectedWishlistId}/items`] });
      
      return true;
    } catch (error) {
      // Show error toast
      toast({
        title: "Failed to add item",
        description: getApiErrorMessage(error, "There was an error adding this item to your wishlist."),
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Filter recommendations to remove rejected ones
  const filteredRecommendations = recommendations?.filter(rec => !rec.isRejected) || [];

  // Show loading skeletons while fetching data
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-emerald-800" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>
            Personalized product suggestions based on your preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="status" aria-live="polite">
            {Array(4).fill(0).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-40 bg-gray-200 animate-pulse" />
                <div className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error message if there was an error fetching recommendations
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-emerald-800" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>
            Personalized product suggestions based on your preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              We couldn&apos;t load your recommendations at this time.
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show a message if no recommendations are available
  if (!filteredRecommendations || filteredRecommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-emerald-800" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>
            Personalized product suggestions based on your preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Add more items to your wishlist to get personalized recommendations.
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render the recommendations
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-emerald-800" />
            <CardTitle>{title}</CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {wishlistOptions && wishlistOptions.length > 0 && (
              <Select
                value={selectedWishlistId}
                onValueChange={setSelectedWishlistId}
              >
                <SelectTrigger className="w-[180px]" aria-label="Select wishlist for recommendation adds">
                  <SelectValue placeholder="Select wishlist" />
                </SelectTrigger>
                <SelectContent>
                  {wishlistOptions.map((wishlist) => (
                    <SelectItem key={wishlist.id} value={wishlist.id.toString()}>
                      {wishlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 px-2"
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
        <CardDescription>
          Personalized suggestions based on your preferences
        </CardDescription>
        {isFetching && !isLoading && (
          <p className="text-xs text-gray-500 mt-1" role="status" aria-live="polite">Updating recommendations…</p>
        )}
        {isError && (
          <p className="text-xs text-red-500 mt-1">{getApiErrorMessage(error, "Unable to refresh recommendations right now.")}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredRecommendations.map((recommendation, index) => (
            <RecommendationCard
              key={`${recommendation.id || index}-${recommendation.title}`}
              recommendation={recommendation}
              onAddToWishlist={handleAddToWishlist}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}