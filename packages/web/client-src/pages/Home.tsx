import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Plans from "@/components/Plans";

export default function Home() {
  return (
    <div className="flex flex-col">
      <Hero />

      <Features />
      <Plans />
    </div>
  );
}
