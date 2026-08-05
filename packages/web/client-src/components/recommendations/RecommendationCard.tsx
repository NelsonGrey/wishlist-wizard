import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, ShoppingCart, Star, ThumbsUp, ThumbsDown, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

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
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAddToWishlist?: (recommendation: Recommendation) => Promise<boolean | void> | boolean | void;
  onStatusChange?: (id: number, status: {isViewed?: boolean, isSaved?: boolean, isRejected?: boolean}) => void;
}

export default function RecommendationCard({ 
  recommendation, 
  onAddToWishlist,
  onStatusChange
}: RecommendationCardProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    id,
    title,
    imageUrl,
    price,
    productUrl,
    store,
    description,
    relevanceScore,
    matchReason,
    isSaved,
    isRejected
  } = recommendation;

  // Generate stars based on relevance score (0-100 converted to 0-5 stars)
  const stars = Math.round((relevanceScore / 100) * 5);
  
  // Handle marking a recommendation as viewed when opened
  const handleView = async () => {
    // Only track view if we have an ID (stored in database)
    if (id && !recommendation.isViewed) {
      try {
        await apiRequest(`/api/recommendations/${id}/status`, {
          method: 'PATCH',
          body: { isViewed: true }
        });
        
        // Update the local state if onStatusChange exists
        if (onStatusChange) {
          onStatusChange(id, { isViewed: true });
        }
      } catch (error) {
        console.error('Error marking recommendation as viewed:', error);
      }
    }
    
    window.open(productUrl, "_blank", "noopener,noreferrer");
  };
  
  // Handle saving or rejecting a recommendation
  const handleStatusUpdate = async (status: {isSaved?: boolean, isRejected?: boolean}) => {
    if (!id) return;
    
    // Don't allow saving if already rejected or rejecting if already saved
    if ((status.isSaved && isRejected) || (status.isRejected && isSaved)) {
      return;
    }
    
    try {
      if (status.isSaved) setIsSaving(true);
      if (status.isRejected) setIsRejecting(true);
      
      await apiRequest(`/api/recommendations/${id}/status`, {
        method: 'PATCH',
        body: status
      });
      
      // Show feedback toast
      if (status.isSaved) {
        toast({
          title: "Recommendation saved",
          description: "We'll remember that you liked this suggestion.",
        });
      } else if (status.isRejected) {
        toast({
          title: "Recommendation hidden",
          description: "We won't show this item again.",
        });
      }
      
      // Update the local state if onStatusChange exists
      if (onStatusChange) {
        onStatusChange(id, status);
      }
      
      // Force a refetch of recommendations if needed
      if (status.isRejected) {
        queryClient.invalidateQueries({queryKey: ['/api/recommendations']});
      }
    } catch (error) {
      console.error('Error updating recommendation status:', error);
      toast({
        title: "Failed to update",
        description: "There was an error updating your preference.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setIsRejecting(false);
    }
  };
  
  // Handle adding to wishlist
  const handleAddToWishlist = async () => {
    if (isSaved) {
      return;
    }

    setIsLoading(true);
    try {
      // Call the parent handler
      if (onAddToWishlist) {
        await onAddToWishlist(recommendation);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Skip rendering if marked as rejected
  if (isRejected) {
    return null;
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative pb-[56%] overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={title}
          className="absolute h-full w-full object-cover transition-transform hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://placehold.co/400x300/e2e8f0/64748b?text=Product+Image";
          }}
        />
        <Badge 
          className="absolute top-2 right-2 bg-emerald-700"
          variant="secondary"
        >
          {store}
        </Badge>
        
        {id && (
          <div className="absolute top-2 left-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white/90 rounded-full"
                  aria-label={`More actions for ${title}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem 
                  onClick={() => handleStatusUpdate({ isSaved: true })}
                  disabled={isSaving || isSaved}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  <span>{isSaved ? "Saved" : "Save suggestion"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleStatusUpdate({ isRejected: true })}
                  disabled={isRejecting}
                  className="text-red-600"
                >
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  <span>Don&apos;t show again</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2">{title}</CardTitle>
        <CardDescription className="flex items-center mt-1">
          <span className="text-lg font-medium text-green-600">{price}</span>
          <div className="ml-auto flex">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  aria-hidden="true"
                  className={`${
                    i < stars ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2 flex-grow">
        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{description}</p>
        <div className="text-xs text-gray-500 italic">
          {matchReason}
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={handleView}
          aria-label={`View product details for ${title}`}
        >
          <ExternalLink size={16} className="mr-1" /> View Details
        </Button>
        {onAddToWishlist && (
          <Button 
            onClick={handleAddToWishlist} 
            size="sm" 
            className="flex-1 bg-emerald-700 hover:bg-emerald-800"
            disabled={isLoading || !!isSaved}
            aria-label={`Add ${title} to selected wishlist`}
          >
            <ShoppingCart size={16} className="mr-1" /> 
            {isSaved ? "Saved" : isLoading ? "Adding..." : "Add"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}