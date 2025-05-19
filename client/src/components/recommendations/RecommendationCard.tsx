import React from "react";
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
import { ExternalLink, ShoppingCart, Star } from "lucide-react";

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

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAddToWishlist?: (recommendation: Recommendation) => void;
}

export default function RecommendationCard({ 
  recommendation, 
  onAddToWishlist 
}: RecommendationCardProps) {
  const {
    title,
    imageUrl,
    price,
    productUrl,
    store,
    description,
    relevanceScore,
    matchReason
  } = recommendation;

  // Generate stars based on relevance score (0-100 converted to 0-5 stars)
  const stars = Math.round((relevanceScore / 100) * 5);

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
          className="absolute top-2 right-2 bg-gradient-to-r from-purple-600 to-blue-500"
          variant="secondary"
        >
          {store}
        </Badge>
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
          onClick={() => window.open(productUrl, "_blank")}
        >
          <ExternalLink size={16} className="mr-1" /> View
        </Button>
        {onAddToWishlist && (
          <Button 
            onClick={() => onAddToWishlist(recommendation)} 
            size="sm" 
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
          >
            <ShoppingCart size={16} className="mr-1" /> Add
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}