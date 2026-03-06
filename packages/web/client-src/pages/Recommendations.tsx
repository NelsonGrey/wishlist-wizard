import React from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import RecommendationsSection from "@/components/recommendations/RecommendationsSection";
import { InboxIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecommendationsHelp } from "@/components/help/RecommendationsHelp";
import { getApiErrorMessage } from "@/lib/api-errors";
import { Wishlist } from "@wishlist-wizard/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";

type Beneficiary = {
  id: number | string;
  name: string;
};

export default function Recommendations() {
  const [, setLocation] = useLocation();
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = React.useState<string>("all");

  // Fetch the user's wishlists
  const {
    data: wishlists,
    isLoading: isWishlistsLoading,
    isError: isWishlistsError,
    error: wishlistsError,
    refetch: refetchWishlists,
  } = useQuery<Wishlist[]>({ 
    queryKey: ['/api/wishlists'],
  });

  const {
    data: beneficiaries,
    isLoading: isBeneficiariesLoading,
  } = useQuery<Beneficiary[]>({
    queryKey: ['/api/beneficiaries'],
  });

  const wishlistOptions = (wishlists || []).map((wishlist) => ({
    id: Number(wishlist.id),
    name: wishlist.name,
  }));

  const beneficiaryOptions = (beneficiaries || []).map((beneficiary) => ({
    id: String(beneficiary.id),
    name: beneficiary.name,
  }));

  const parsedBeneficiaryId = selectedBeneficiaryId === "all" ? undefined : Number(selectedBeneficiaryId);

  const recommendationsTitle =
    selectedBeneficiaryId === "all"
      ? "AI-Powered Recommendations"
      : `AI Recommendations for ${beneficiaryOptions.find((option) => option.id === selectedBeneficiaryId)?.name || "Beneficiary"}`;

  return (
    <>
      <Helmet>
        <title>AI Recommendations | Wishlist Wizard</title>
        <meta 
          name="description" 
          content="Get personalized product recommendations powered by AI based on your wishlist items and preferences."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">
                  Smart Recommendations
                </h1>
                <p className="text-gray-600 mt-2">
                  Discover products tailored to your tastes and preferences
                </p>
              </div>
              <RecommendationsHelp />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setLocation('/app/dashboard')}>
                Open Wishlists
              </Button>
              <Button variant="outline" onClick={() => setLocation('/app/calendar')}>
                Open Calendar
              </Button>
              <Button onClick={() => setLocation('/app/analytics')}>
                Open Analytics
              </Button>
            </div>
          </div>

          <div className="mt-4 md:mt-0 w-full md:w-80 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="recommendations-beneficiary-filter">
                Recommendation focus
              </label>
              <Select
                value={selectedBeneficiaryId}
                onValueChange={setSelectedBeneficiaryId}
                disabled={isBeneficiariesLoading}
              >
                <SelectTrigger id="recommendations-beneficiary-filter" aria-label="Select recommendation focus">
                  <SelectValue placeholder={isBeneficiariesLoading ? "Loading recipients..." : "All wishlists"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All wishlists</SelectItem>
                  {beneficiaryOptions.map((beneficiary) => (
                    <SelectItem key={beneficiary.id} value={beneficiary.id}>
                      {beneficiary.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isWishlistsLoading ? (
              <p className="text-sm text-gray-500">Loading wishlists...</p>
            ) : isWishlistsError ? (
              <div className="space-y-2">
                <p className="text-sm text-red-500">Failed to load wishlists. Please try again.</p>
                <p className="text-xs text-gray-500">{getApiErrorMessage(wishlistsError, "Temporary connection issue.")}</p>
                <Button variant="outline" size="sm" onClick={() => refetchWishlists()}>
                  Retry
                </Button>
              </div>
            ) : wishlists && wishlists.length > 0 ? (
              <p className="text-sm text-gray-600">
                Choose a wishlist directly in the recommendations card when adding items.
              </p>
            ) : (
              <p className="text-sm text-gray-500">No wishlists yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Display AI-Powered Recommendations */}
          <RecommendationsSection
            beneficiaryId={parsedBeneficiaryId}
            wishlistOptions={wishlistOptions}
            title={recommendationsTitle}
          />

          {/* How it works section */}
          <Card>
            <CardHeader>
              <CardTitle>How AI Recommendations Work</CardTitle>
              <CardDescription>
                Our recommendation engine analyzes your wishlists to find products you&apos;ll love
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center p-4">
                  <div className="bg-emerald-100 p-3 rounded-full mb-4">
                    <InboxIcon className="h-8 w-8 text-emerald-800" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Item Analysis</h3>
                  <p className="text-gray-600">
                    We analyze the items in your wishlist to understand your preferences, including brands, categories, price ranges, and styles.
                  </p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4">
                  <div className="bg-emerald-100 p-3 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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