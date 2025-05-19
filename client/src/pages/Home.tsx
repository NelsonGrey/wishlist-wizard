import { Link } from "wouter";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import { InlineAd, ResponsiveAd } from "@/components/ads";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
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
      
      <Footer />
    </div>
  );
}
