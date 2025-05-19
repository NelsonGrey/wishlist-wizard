import { Link } from "wouter";
import { 
  CameraIcon, 
  Share2, 
  AlertCircle, 
  CalendarClock, 
  BadgeDollarSign,
  Smile,
  Smartphone,
  Award
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Features() {
  return (
    <section className="py-16 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Exclusive Features</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            WishKeeper goes beyond basic wishlists with these powerful and exclusive features
            that make gift-giving easier and more delightful.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Mobile App Feature */}
          <Card className="border-2 hover:border-primary/30 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-primary/10 rounded-lg mb-2 flex items-center justify-center">
                <Smartphone className="text-primary" size={24} />
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
              <Link href="/mobile-demo">
                <Button variant="outline" className="w-full">Try the Mobile Demo</Button>
              </Link>
            </CardFooter>
          </Card>
          
          {/* AR Visualization Feature */}
          <Card className="border-2 hover:border-primary/30 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-primary/10 rounded-lg mb-2 flex items-center justify-center">
                <CameraIcon className="text-primary" size={24} />
              </div>
              <CardTitle>AR Visualization</CardTitle>
              <CardDescription>Try before you buy</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                See how items will look in your space with augmented reality. Compare true size and
                check if furniture will fit before purchasing.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/ar-visualizer">
                <Button variant="outline" className="w-full">Experience AR Demo</Button>
              </Link>
            </CardFooter>
          </Card>
          
          {/* Social Sharing Feature */}
          <Card className="border-2 hover:border-primary/30 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-primary/10 rounded-lg mb-2 flex items-center justify-center">
                <Share2 className="text-primary" size={24} />
              </div>
              <CardTitle>Social Integration</CardTitle>
              <CardDescription>Connect with friends and family</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Share wishlists across social media platforms, find friends' wishlists, and collaborate 
                on group gifts seamlessly.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/social-sharing">
                <Button variant="outline" className="w-full">Try Social Sharing</Button>
              </Link>
            </CardFooter>
          </Card>
          
          {/* Price Tracking Feature */}
          <Card className="border-2 hover:border-primary/30 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-primary/10 rounded-lg mb-2 flex items-center justify-center">
                <BadgeDollarSign className="text-primary" size={24} />
              </div>
              <CardTitle>Price Tracking</CardTitle>
              <CardDescription>Never miss a deal</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Automatically track prices of items in your wishlists and get alerts when they drop
                or when similar items go on sale.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>Coming Soon</Button>
            </CardFooter>
          </Card>
          
          {/* Occasion Reminders Feature */}
          <Card className="border-2 hover:border-primary/30 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-primary/10 rounded-lg mb-2 flex items-center justify-center">
                <CalendarClock className="text-primary" size={24} />
              </div>
              <CardTitle>Calendar Integration</CardTitle>
              <CardDescription>Never forget a special date</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Sync important occasions with your calendar apps and get timely reminders for
                birthdays, anniversaries, and other gift-giving events.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>Coming Soon</Button>
            </CardFooter>
          </Card>
          
          {/* AI Recommendations Feature */}
          <Card className="border-2 hover:border-primary/30 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <div className="p-2 w-12 h-12 bg-primary/10 rounded-lg mb-2 flex items-center justify-center">
                <Award className="text-primary" size={24} />
              </div>
              <CardTitle>AI Gift Recommendations</CardTitle>
              <CardDescription>Personalized suggestions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Get intelligent gift suggestions based on preferences, past purchases, and similar users.
                Our AI helps you find the perfect gift every time.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>Coming Soon</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}