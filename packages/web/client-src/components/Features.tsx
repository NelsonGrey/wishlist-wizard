import { Link } from "wouter";
import { 
  Compass,
  LayoutGrid,
  CalendarClock, 
  Puzzle,
  Smartphone,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Features() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-800 to-green-700 bg-clip-text text-transparent">Product Features</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Wishlist Wizard combines planning, sharing, and calendar-powered coordination to make gifting easier.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Mobile App Feature */}
          <Card className="border-2 hover:border-emerald-200 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-emerald-100 rounded-lg mb-2 flex items-center justify-center">
                <Smartphone className="text-emerald-800" size={24} />
              </div>
              <CardTitle>Mobile App</CardTitle>
              <CardDescription>Take your wishlists anywhere</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Our native mobile app with offline mode keeps your wishlists synced across all your devices.
                Scan barcodes in-store to instantly add items.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/mobile-app-demo">Get Early Access</Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Social Network Discovery Feature */}
          <Card className="border-2 hover:border-emerald-200 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-emerald-100 rounded-lg mb-2 flex items-center justify-center">
                <Compass className="text-emerald-800" size={24} />
              </div>
              <CardTitle>Social Network & Discovery</CardTitle>
              <CardDescription>Find and share trusted wishlists</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Discover people you trust, share curated wishlists, and coordinate gifting without duplicate purchases.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/social-integration-demo">Open Network Demo</Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Browser Extension Feature */}
          <Card className="border-2 hover:border-emerald-200 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-emerald-100 rounded-lg mb-2 flex items-center justify-center">
                <Puzzle className="text-emerald-800" size={24} />
              </div>
              <CardTitle>Browser Extension</CardTitle>
              <CardDescription>Save items in one click</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Capture products from shopping sites instantly and send them directly to your wishlists while you browse.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/browser-extension-demo">View Extension</Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Event Reminders Feature */}
          <Card className="border-2 hover:border-emerald-200 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-emerald-100 rounded-lg mb-2 flex items-center justify-center">
                <CalendarClock className="text-emerald-800" size={24} />
              </div>
              <CardTitle>Calendar Integration</CardTitle>
              <CardDescription>Never forget a special date</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Sync important events with your calendar apps and get timely reminders for
                birthdays, anniversaries, and other gift-giving events.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/calendar-integration-demo">Open Calendar Demo</Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Wishlist Management Feature */}
          <Card className="border-2 hover:border-emerald-200 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-emerald-100 rounded-lg mb-2 flex items-center justify-center">
                <LayoutGrid className="text-emerald-800" size={24} />
              </div>
              <CardTitle>Wishlist Management</CardTitle>
              <CardDescription>Organize every event in one place</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Create multiple lists, prioritize items, and keep gifting plans structured across events and recipients.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/wishlist-management-demo">Start Organizing</Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Basic Analytics Feature */}
          <Card className="border-2 hover:border-emerald-200 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-emerald-100 rounded-lg mb-2 flex items-center justify-center">
                <BarChart3 className="text-emerald-800" size={24} />
              </div>
              <CardTitle>Basic Activity Insights</CardTitle>
              <CardDescription>Understand list engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                See simple engagement signals so you can improve your lists and keep gifting plans on track.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/basic-activity-insights-demo">View Insights</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
