import Hero from "@/components/Hero";
import Features from "@/components/Features";
import { InlineAd, ResponsiveAd } from "@/components/ads";

export default function Home() {
  return (
    <div className="flex flex-col">
      <Hero />
      
      {/* Responsive ad after hero section */}
      <div className="container mx-auto px-4 mt-6">
        <ResponsiveAd />
      </div>
      
      <Features />
      
      {/* Inline ad before footer */}
      <div className="container mx-auto px-4 mb-6">
        <InlineAd />
      </div>
    </div>
  );
}
