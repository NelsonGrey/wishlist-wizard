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
      ? "Personalized Recommendations"
      : `Recommendations for ${beneficiaryOptions.find((option) => option.id === selectedBeneficiaryId)?.name || "Beneficiary"}`;

  return (
    <>
      <Helmet>
        <title>Recommendations | Wishlist Wizard</title>
        <meta
          name="description"
          content="Get personalized product recommendations based on your wishlist items and preferences."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">
                  Recommendations
                </h1>
                <p className="text-gray-600 mt-2">
                  Curated gift ideas based on your wishlists
                </p>
              </div>
              <RecommendationsHelp />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setLocation('/app/wishlists')}>
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
          {/* Personalized Recommendations */}
          <RecommendationsSection
            beneficiaryId={parsedBeneficiaryId}
            wishlistOptions={wishlistOptions}
            title={recommendationsTitle}
          />

          {/* Coming soon notice */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <InboxIcon className="h-6 w-6 text-amber-700" />
                <CardTitle className="text-amber-900">Personalized Recommendations — Coming Soon</CardTitle>
              </div>
              <CardDescription className="text-amber-800">
                We&apos;re building a recommendation engine that will suggest products based on your wishlist preferences. Check back soon.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-700">
                In the meantime, use the filter above to browse any recommendations that have been manually curated, or explore items through your wishlists and the browser extension.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}