import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

interface Recommendation {
  title: string;
  imageUrl: string;
  price: string;
  productUrl: string;
  store: string;
  description: string;
  relevanceScore: number;
  matchReason: string;
}

export default function RecommendationsSection() {
  const { toast } = useToast();
  const [wishlistId, setWishlistId] = useState<number | null>(null);
  
  // Fetch recommendations from the API
  const { data: recommendations, isLoading, isError, refetch } = useQuery<Recommendation[]>({
    queryKey: ['/api/recommendations'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle adding a recommendation to a wishlist
  const handleAddToWishlist = async (recommendation: Recommendation) => {
    if (!wishlistId) {
      // If no wishlist is selected, show a toast message
      toast({
        title: "No wishlist selected",
        description: "Please select a wishlist to add this item to.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare the item data
      const itemData = {
        wishlistId,
        title: recommendation.title,
        price: recommendation.price,
        imageUrl: recommendation.imageUrl,
        productUrl: recommendation.productUrl,
        store: recommendation.store,
        note: `Added from AI recommendations. ${recommendation.matchReason}`,
      };

      // Send a POST request to add the item
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        throw new Error('Failed to add item to wishlist');
      }

      // Show success toast
      toast({
        title: "Item added!",
        description: `"${recommendation.title}" was added to your wishlist.`,
      });
    } catch (error) {
      // Show error toast
      toast({
        title: "Failed to add item",
        description: "There was an error adding this item to your wishlist.",
        variant: "destructive",
      });
    }
  };

  // Show loading skeletons while fetching data
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
            <CardTitle>Recommendations For You</CardTitle>
          </div>
          <CardDescription>
            Personalized product suggestions based on your wishlist items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
            <CardTitle>Recommendations For You</CardTitle>
          </div>
          <CardDescription>
            Personalized product suggestions based on your wishlist items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              We couldn't load your recommendations at this time.
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
  if (!recommendations || recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
            <CardTitle>Recommendations For You</CardTitle>
          </div>
          <CardDescription>
            Personalized product suggestions based on your wishlist items
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
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
            <CardTitle>AI-Powered Recommendations</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 px-2"
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Personalized suggestions based on your wishlist items
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recommendations.map((recommendation, index) => (
            <RecommendationCard
              key={index}
              recommendation={recommendation}
              onAddToWishlist={handleAddToWishlist}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}