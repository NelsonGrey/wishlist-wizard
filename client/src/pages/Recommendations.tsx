import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import RecommendationsSection from "@/components/recommendations/RecommendationsSection";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { InboxIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Recommendations() {
  const [selectedWishlistId, setSelectedWishlistId] = useState<string>("");

  // Fetch the user's wishlists
  const { data: wishlists } = useQuery({ 
    queryKey: ['/api/wishlists'],
  });

  return (
    <>
      <Helmet>
        <title>AI Recommendations | WishKeeper</title>
        <meta 
          name="description" 
          content="Get personalized product recommendations powered by AI based on your wishlist items and preferences."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Smart Recommendations
            </h1>
            <p className="text-gray-600 mt-2">
              Discover products tailored to your tastes and preferences
            </p>
          </div>

          {wishlists && wishlists.length > 0 && (
            <div className="mt-4 md:mt-0 w-full md:w-64">
              <Select 
                value={selectedWishlistId} 
                onValueChange={setSelectedWishlistId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select wishlist for adding items" />
                </SelectTrigger>
                <SelectContent>
                  {wishlists.map((wishlist) => (
                    <SelectItem key={wishlist.id} value={wishlist.id.toString()}>
                      {wishlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* Display AI-Powered Recommendations */}
          <RecommendationsSection />

          {/* How it works section */}
          <Card>
            <CardHeader>
              <CardTitle>How AI Recommendations Work</CardTitle>
              <CardDescription>
                Our recommendation engine analyzes your wishlists to find products you'll love
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center p-4">
                  <div className="bg-purple-100 p-3 rounded-full mb-4">
                    <InboxIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Item Analysis</h3>
                  <p className="text-gray-600">
                    We analyze the items in your wishlist to understand your preferences, including brands, categories, price ranges, and styles.
                  </p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4">
                  <div className="bg-blue-100 p-3 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">AI Processing</h3>
                  <p className="text-gray-600">
                    Our advanced AI models process this data to identify patterns and preferences that inform product recommendations.
                  </p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4">
                  <div className="bg-green-100 p-3 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Personalization</h3>
                  <p className="text-gray-600">
                    Recommendations are then personalized to match your taste, with relevance scores to show how well each item matches your preferences.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}